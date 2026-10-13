package com.sras.backend.service.impl;

import com.sras.backend.dto.request.CallSignalRequest;
import com.sras.backend.dto.request.StartCallRequest;
import com.sras.backend.dto.response.CallResponse;
import com.sras.backend.entity.CallSession;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.CallSessionRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.service.push.PushService;
import com.sras.backend.websocket.ChatWebSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Vòng đời cuộc gọi giữa khách / chủ gara / nhân viên trong một đơn — kiểm cả 6 chiều gọi, không cần DB.
 * Repository, WebSocket và push được giả lập; sự kiện WebSocket gửi đi được ghi lại để kiểm tra định tuyến.
 */
class CallServiceFlowTest {

    private static final long CALL_ID = 900L;
    private static final long REQUEST_ID = 100L;

    private CallSessionRepository callRepository;
    private RescueRequestRepository rescueRequestRepository;
    private GarageStaffRepository garageStaffRepository;
    private ChatWebSocketHandler ws;
    private PushService pushService;
    private CallServiceImpl service;

    private User customer;
    private User owner;
    private User staffUser;
    private Garage garage;
    private RescueRequest request;

    /** Các sự kiện WebSocket đã gửi: (userId, payload). */
    private final List<Sent> sent = new ArrayList<>();

    private record Sent(long userId, String payload) {}

    @BeforeEach
    void setUp() {
        callRepository = mock(CallSessionRepository.class);
        rescueRequestRepository = mock(RescueRequestRepository.class);
        garageStaffRepository = mock(GarageStaffRepository.class);
        ws = mock(ChatWebSocketHandler.class);
        pushService = mock(PushService.class);

        service = new CallServiceImpl(callRepository, rescueRequestRepository,
                new RescueParticipants(garageStaffRepository), ws, pushService);
        ReflectionTestUtils.setField(service, "ringTimeoutSeconds", 45);

        customer = user(1L, "Khách A");
        owner = user(2L, "Chủ gara B");
        staffUser = user(3L, "Nhân viên C");

        garage = new Garage();
        garage.setId(10L);
        garage.setOwner(owner);

        GarageStaff staff = new GarageStaff();
        staff.setId(20L);
        staff.setGarage(garage);
        staff.setUser(staffUser);

        request = new RescueRequest();
        request.setId(REQUEST_ID);
        request.setCode("RQ1");
        request.setCustomer(customer);
        request.setGarage(garage);
        request.setStaff(staff);
        request.setStatus(RescueStatus.EN_ROUTE);

        when(rescueRequestRepository.findByIdAndIsDeletedFalse(REQUEST_ID)).thenReturn(Optional.of(request));
        when(callRepository.save(any(CallSession.class))).thenAnswer(inv -> {
            CallSession c = inv.getArgument(0);
            c.setId(CALL_ID);
            when(callRepository.findWithLockById(CALL_ID)).thenReturn(Optional.of(c));
            when(callRepository.findById(CALL_ID)).thenReturn(Optional.of(c));
            return c;
        });
        doAnswer(inv -> {
            sent.add(new Sent(inv.getArgument(0), inv.getArgument(1)));
            return null;
        }).when(ws).sendToUser(anyLong(), anyString());
    }

    // ─────────────────────────── 6 chiều gọi ───────────────────────────

    @ParameterizedTest(name = "{0} gọi {1}: đổ chuông đúng người")
    @CsvSource({
            "CUSTOMER, GARAGE", "CUSTOMER, STAFF",
            "GARAGE, CUSTOMER", "GARAGE, STAFF",
            "STAFF, CUSTOMER", "STAFF, GARAGE"})
    void startRingsTheRightPerson(String callerRole, String calleeRole) {
        User caller = userOf(callerRole);
        User callee = userOf(calleeRole);

        CallResponse res = service.start(caller, startReq(calleeRole));

        assertEquals("RINGING", res.getStatus());
        assertEquals(caller.getId(), res.getCallerId());
        assertEquals(callee.getId(), res.getCalleeId());
        assertEquals(callerRole, res.getCallerRole());
        assertEquals(calleeRole, res.getCalleeRole());
        assertEquals("RQ1", res.getRescueCode());

        List<Sent> toCallee = sentTo(callee.getId(), "CALL_INCOMING");
        assertEquals(1, toCallee.size(), "người nhận phải nhận đúng 1 CALL_INCOMING");
        assertTrue(toCallee.get(0).payload().contains("\"callerRole\":\"" + callerRole + "\""));
        assertTrue(sentTo(caller.getId(), "CALL_INCOMING").isEmpty(), "người gọi không nhận CALL_INCOMING");
    }

    @ParameterizedTest(name = "{0} gọi {1}: nghe máy → trao OFFER/ANSWER → kết thúc")
    @CsvSource({
            "CUSTOMER, GARAGE", "CUSTOMER, STAFF",
            "GARAGE, CUSTOMER", "GARAGE, STAFF",
            "STAFF, CUSTOMER", "STAFF, GARAGE"})
    void fullLifecycleRoutesSignalingToTheOtherSide(String callerRole, String calleeRole) {
        User caller = userOf(callerRole);
        User callee = userOf(calleeRole);
        service.start(caller, startReq(calleeRole));
        sent.clear();

        // Người nhận nghe máy → cả hai bên biết (người gọi để tạo OFFER).
        CallResponse accepted = service.accept(callee, CALL_ID);
        assertEquals("ONGOING", accepted.getStatus());
        assertEquals(1, sentTo(caller.getId(), "CALL_ACCEPTED").size());
        assertEquals(1, sentTo(callee.getId(), "CALL_ACCEPTED").size());
        sent.clear();

        // OFFER chỉ đi từ người gọi sang người nhận.
        service.signal(caller, CALL_ID, signal("OFFER", "v=0 offer"));
        assertEquals(1, sentTo(callee.getId(), "CALL_SIGNAL").size());
        assertTrue(sentTo(callee.getId(), "CALL_SIGNAL").get(0).payload().contains("\"type\":\"OFFER\""));
        assertTrue(sentTo(caller.getId(), "CALL_SIGNAL").isEmpty());
        sent.clear();

        // ANSWER chỉ đi từ người nhận sang người gọi.
        service.signal(callee, CALL_ID, signal("ANSWER", "v=0 answer"));
        assertEquals(1, sentTo(caller.getId(), "CALL_SIGNAL").size());
        assertTrue(sentTo(caller.getId(), "CALL_SIGNAL").get(0).payload().contains("\"type\":\"ANSWER\""));
        assertTrue(sentTo(callee.getId(), "CALL_SIGNAL").isEmpty());
        sent.clear();

        // Sai chiều bị chặn.
        assertThrows(BadRequestException.class, () -> service.signal(callee, CALL_ID, signal("OFFER", "x")));
        assertThrows(BadRequestException.class, () -> service.signal(caller, CALL_ID, signal("ANSWER", "x")));

        // Một bên cúp → cả hai nhận CALL_ENDED.
        CallResponse ended = service.end(callee, CALL_ID, false);
        assertEquals("ENDED", ended.getStatus());
        assertNotNull(ended.getDurationSec());
        assertEquals(1, sentTo(caller.getId(), "CALL_ENDED").size());
        assertEquals(1, sentTo(callee.getId(), "CALL_ENDED").size());
    }

    @ParameterizedTest(name = "{0} gọi {1}: người nhận từ chối")
    @CsvSource({"CUSTOMER, GARAGE", "GARAGE, STAFF", "STAFF, CUSTOMER"})
    void rejectEndsTheCallForBoth(String callerRole, String calleeRole) {
        User caller = userOf(callerRole);
        User callee = userOf(calleeRole);
        service.start(caller, startReq(calleeRole));
        sent.clear();

        assertEquals("REJECTED", service.reject(callee, CALL_ID).getStatus());
        assertEquals(1, sentTo(caller.getId(), "CALL_ENDED").size());
        assertEquals(1, sentTo(callee.getId(), "CALL_ENDED").size());
    }

    // ─────────────────────────── Push khi người nhận không mở app ───────────────────────────

    @Test
    void offlineCalleeGetsPushOnlineCalleeDoesNot() {
        // Người nhận (khách) đang offline → đánh thức bằng push INCOMING_CALL, hạn = thời gian đổ chuông.
        service.start(staffUser, startReq("CUSTOMER"));
        verify(pushService).sendAfterCommit(eq(customer.getId()), isNull(), eq("Cuộc gọi đến"), contains("RQ1"),
                argThat((Map<String, Object> d) -> "INCOMING_CALL".equals(d.get("type"))
                        && Long.valueOf(CALL_ID).equals(d.get("callId"))
                        && "STAFF".equals(d.get("peer"))),
                eq(45));
    }

    @Test
    void onlineCalleeGetsNoPush() {
        when(ws.isOnline(customer.getId())).thenReturn(true);
        service.start(staffUser, startReq("CUSTOMER"));
        verifyNoInteractions(pushService);
    }

    // ─────────────────────────── Trường hợp bị từ chối ───────────────────────────

    /** Chỉ từ lúc gara nhận đơn đến lúc chờ thanh toán mới gọi được (khớp CALLABLE_STATUSES ở mobile). */
    @ParameterizedTest
    @EnumSource(value = RescueStatus.class,
            names = {"ACCEPTED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "DIAGNOSED", "REPAIRING_ONSITE", "TOWING",
                    "COMPLETED", "AWAITING_PAYMENT"})
    void callableStatusesAllowCalling(RescueStatus status) {
        request.setStatus(status);
        assertEquals("RINGING", service.start(customer, startReq("STAFF")).getStatus());
    }

    @ParameterizedTest
    @EnumSource(value = RescueStatus.class,
            names = {"DRAFT", "SEARCHING", "PENDING_GARAGE", "NO_GARAGE_FOUND", "DECLINED", "PAID", "RATED", "CANCELLED"})
    void otherStatusesRejectCalling(RescueStatus status) {
        request.setStatus(status);
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.start(customer, startReq("STAFF")));
        assertEquals("Chỉ gọi được khi đơn đang được xử lý", e.getMessage());
    }

    @Test
    void strangerCannotCall() {
        User stranger = user(99L, "Người lạ");
        assertThrows(UnauthorizedException.class, () -> service.start(stranger, startReq("CUSTOMER")));
    }

    @Test
    void staffNotAssignedToTheOrderCannotCall() {
        User other = user(5L, "Nhân viên khác của gara");
        GarageStaff otherStaff = new GarageStaff();
        otherStaff.setGarage(garage);
        otherStaff.setUser(other);
        when(garageStaffRepository.findByGarageAndUserAndIsDeletedFalse(garage, other)).thenReturn(Optional.of(otherStaff));

        BadRequestException e = assertThrows(BadRequestException.class, () -> service.start(other, startReq("CUSTOMER")));
        assertEquals("Chỉ nhân viên được gán cho đơn mới gọi được", e.getMessage());
    }

    @Test
    void cannotCallStaffBeforeOneIsAssigned() {
        request.setStaff(null);
        assertEquals("Đơn chưa được gán nhân viên",
                assertThrows(BadRequestException.class, () -> service.start(customer, startReq("STAFF"))).getMessage());
        assertEquals("Đơn chưa được gán nhân viên",
                assertThrows(BadRequestException.class, () -> service.start(owner, startReq("STAFF"))).getMessage());
    }

    @Test
    void cannotCallYourself() {
        assertEquals("Không thể tự gọi cho chính mình",
                assertThrows(BadRequestException.class, () -> service.start(customer, startReq("CUSTOMER"))).getMessage());
    }

    @Test
    void cannotCallSomeoneAlreadyInACall() {
        when(callRepository.findActiveByUser(eq(staffUser.getId()), any())).thenReturn(List.of(new CallSession()));
        BadRequestException e = assertThrows(BadRequestException.class, () -> service.start(customer, startReq("STAFF")));
        assertTrue(e.getMessage().contains("bận"));
    }

    @Test
    void onlyTheCalleeCanAnswerOrReject() {
        service.start(customer, startReq("STAFF"));
        assertThrows(BadRequestException.class, () -> service.accept(customer, CALL_ID));
        assertThrows(BadRequestException.class, () -> service.reject(customer, CALL_ID));
        assertThrows(UnauthorizedException.class, () -> service.accept(owner, CALL_ID));
    }

    // ─────────────────────────── Helpers ───────────────────────────

    private static User user(long id, String name) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        return u;
    }

    private User userOf(String role) {
        return switch (role) {
            case "CUSTOMER" -> customer;
            case "GARAGE" -> owner;
            case "STAFF" -> staffUser;
            default -> throw new IllegalArgumentException(role);
        };
    }

    private static StartCallRequest startReq(String peer) {
        StartCallRequest r = new StartCallRequest();
        r.setRescueRequestId(REQUEST_ID);
        r.setPeer(peer);
        return r;
    }

    private static CallSignalRequest signal(String type, String sdp) {
        CallSignalRequest r = new CallSignalRequest();
        r.setType(type);
        r.setSdp(sdp);
        return r;
    }

    private List<Sent> sentTo(long userId, String event) {
        return sent.stream()
                .filter(s -> s.userId() == userId && s.payload().contains("\"event\":\"" + event + "\""))
                .toList();
    }
}
