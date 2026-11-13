package com.sras.backend.service.impl;

import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.Garage;
import com.sras.backend.entity.GarageStaff;
import com.sras.backend.entity.RescueRequest;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.Capability;
import com.sras.backend.entity.enums.GarageStatus;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.GarageRepository;
import com.sras.backend.repository.GarageStaffRepository;
import com.sras.backend.repository.RescueRequestRepository;
import com.sras.backend.repository.RescueStatusHistoryRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.RescuePricingConfigService;
import com.sras.backend.service.RescueRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Chia sẻ vị trí của khách chạy trên DB thật (H2): truy vấn cập nhật có điều kiện và cờ báo một lần đều thật,
 * chỉ phần gửi thông báo được giả lập.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED) // để transaction của service commit thật
@Import({RescueRequestServiceImpl.class, RescueNotifier.class})
class CustomerLocationShareTest {

    private static final double PICKUP_LAT = 10.0;
    private static final double PICKUP_LNG = 106.0;
    // 0,001 độ vĩ khoảng 111 m.
    private static final double NEAR_LAT = PICKUP_LAT + 0.0005;
    private static final double FAR_LAT = PICKUP_LAT + 0.002;
    private static final double GOOD_GPS_M = 10.0;
    private static final double BAD_GPS_M = 200.0;

    @Autowired RescueRequestService service;
    @Autowired RescueRequestRepository requestRepository;
    @Autowired RescueStatusHistoryRepository historyRepository;
    @Autowired GarageStaffRepository staffRepository;
    @Autowired GarageRepository garageRepository;
    @Autowired UserRepository userRepository;

    @MockBean NotificationService notificationService;
    @MockBean RescuePricingConfigService pricingConfigService;

    private User customer;
    private User owner;
    private User staffUser;
    private Garage garage;
    private GarageStaff staff;

    @BeforeEach
    void setUp() {
        historyRepository.deleteAllInBatch();
        requestRepository.deleteAllInBatch();
        staffRepository.deleteAllInBatch();
        garageRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();

        customer = newUser("0900000001", UserRole.CUSTOMER);
        owner = newUser("0900000002", UserRole.GARAGE_OWNER);
        staffUser = newUser("0900000003", UserRole.GARAGE_STAFF);
        garage = newGarage(owner);
        staff = new GarageStaff();
        staff.setGarage(garage);
        staff.setUser(staffUser);
        staff = staffRepository.save(staff);
    }

    @Test
    void notifiesAssignedStaffOnceEvenWhenSharingIsToggled() {
        Long id = newRequest(RescueStatus.EN_ROUTE);

        service.updateCustomerLocation(customer, id, NEAR_LAT, PICKUP_LNG, GOOD_GPS_M);
        service.updateCustomerLocation(customer, id, NEAR_LAT, PICKUP_LNG, GOOD_GPS_M);
        service.stopCustomerLocation(customer, id);
        service.updateCustomerLocation(customer, id, NEAR_LAT, PICKUP_LNG, GOOD_GPS_M);

        verify(notificationService, times(1)).createNotification(
                argThat(u -> u.getId().equals(staffUser.getId())),
                eq(NotificationType.CUSTOMER_SHARING_LOCATION),
                anyString(), anyString(), eq(RescueNotifier.REF_TYPE), eq(id));
    }

    @Test
    void locationIsVisibleToCustomerAndAssignedStaffButNotGarageOwner() {
        Long id = newRequest(RescueStatus.EN_ROUTE);
        service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M);

        RescueRequestResponse forCustomer = service.getRequest(customer, id);
        assertEquals(FAR_LAT, forCustomer.getCustomerLat());
        assertEquals(FAR_LAT, forCustomer.getMeetLat());

        RescueRequestResponse forStaff = service.getStaffActive(staffUser);
        assertEquals(FAR_LAT, forStaff.getCustomerLat());
        assertEquals(FAR_LAT, forStaff.getMeetLat());
        assertNotNull(forStaff.getCustomerLocationAgeSec());

        RescueRequestResponse forOwner = service.getRequest(owner, id);
        assertNull(forOwner.getCustomerLat());
        assertNull(forOwner.getCustomerLng());
        assertNull(forOwner.getCustomerLocationAt());
        assertNull(forOwner.getMeetLat());
        assertNull(forOwner.getMeetLng());
    }

    @Test
    void meetPointMovesOnlyWhenCustomerIsFarFromTheCurrentOne() {
        Long id = newRequest(RescueStatus.EN_ROUTE);

        assertNull(service.updateCustomerLocation(customer, id, NEAR_LAT, PICKUP_LNG, GOOD_GPS_M).getMeetLat(),
                "chưa tới 100 m thì vẫn tới điểm đón");

        assertEquals(FAR_LAT, service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M).getMeetLat());

        // So với điểm tới hiện tại chứ không phải điểm đón, nên đi thêm vài chục mét không phải tính lại tuyến.
        assertEquals(FAR_LAT, service.updateCustomerLocation(customer, id, FAR_LAT + 0.0005, PICKUP_LNG, GOOD_GPS_M).getMeetLat());

        double farther = FAR_LAT + 0.002;
        assertEquals(farther, service.updateCustomerLocation(customer, id, farther, PICKUP_LNG, GOOD_GPS_M).getMeetLat());
    }

    @Test
    void inaccurateGpsUpdatesLocationButNotMeetPoint() {
        Long id = newRequest(RescueStatus.EN_ROUTE);

        RescueRequestResponse bad = service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, BAD_GPS_M);
        assertEquals(FAR_LAT, bad.getCustomerLat());
        assertNull(bad.getMeetLat());

        assertNull(service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, null).getMeetLat());
    }

    @Test
    void stopClearsLocationAndMeetPoint() {
        Long id = newRequest(RescueStatus.EN_ROUTE);
        service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M);

        service.stopCustomerLocation(customer, id);

        RescueRequest saved = requestRepository.findById(id).orElseThrow();
        assertNull(saved.getCustomerLat());
        assertNull(saved.getCustomerLocationAt());
        assertNull(saved.getMeetLat());
        assertNull(service.getStaffActive(staffUser).getCustomerLat());
    }

    @Test
    void arrivingClearsLocationAndRejectsLaterPushes() {
        Long id = newRequest(RescueStatus.ASSIGNED);
        service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M);

        service.advanceStatus(staffUser, id, RescueStatus.EN_ROUTE);
        assertEquals(FAR_LAT, requestRepository.findById(id).orElseThrow().getCustomerLat(), "đang tới thì vẫn chia sẻ");

        service.advanceStatus(staffUser, id, RescueStatus.ARRIVED);
        RescueRequest saved = requestRepository.findById(id).orElseThrow();
        assertNull(saved.getCustomerLat());
        assertNull(saved.getMeetLat());

        assertThrows(BadRequestException.class,
                () -> service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M));
        assertNull(requestRepository.findById(id).orElseThrow().getCustomerLat());
    }

    @Test
    void rejectedBeforeStaffIsAssigned() {
        Long id = newRequest(RescueStatus.ACCEPTED);
        assertThrows(BadRequestException.class,
                () -> service.updateCustomerLocation(customer, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M));
    }

    @Test
    void onlyTheOrderCustomerCanShareOrStop() {
        Long id = newRequest(RescueStatus.EN_ROUTE);
        User stranger = newUser("0900000009", UserRole.CUSTOMER);

        assertThrows(UnauthorizedException.class,
                () -> service.updateCustomerLocation(stranger, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M));
        assertThrows(UnauthorizedException.class, () -> service.updateCustomerLocation(staffUser, id, FAR_LAT, PICKUP_LNG, GOOD_GPS_M));
        assertThrows(UnauthorizedException.class, () -> service.stopCustomerLocation(stranger, id));
    }

    private Long newRequest(RescueStatus status) {
        RescueRequest r = new RescueRequest();
        r.setCode("RQ" + System.nanoTime() % 1_000_000_000L);
        r.setCustomer(customer);
        r.setVehicleType(VehicleType.CAR);
        r.setSymptom("Hỏng máy");
        r.setPickupLat(PICKUP_LAT);
        r.setPickupLng(PICKUP_LNG);
        r.setPaymentMethod(RequestPaymentMethod.CASH);
        r.setStatus(status);
        r.setGarage(garage);
        if (status != RescueStatus.ACCEPTED) r.setStaff(staff);
        return requestRepository.save(r).getId();
    }

    private User newUser(String phone, UserRole role) {
        User u = new User();
        u.setPhone(phone);
        u.setPasswordHash("x");
        u.setFullName("User " + phone);
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        u.setIsPhoneVerified(true);
        return userRepository.save(u);
    }

    private Garage newGarage(User garageOwner) {
        Garage g = new Garage();
        g.setOwner(garageOwner);
        g.setName("Gara " + garageOwner.getPhone());
        g.setPhone(garageOwner.getPhone());
        g.setAddress("1 Test");
        g.setLat(10.0);
        g.setLng(106.0);
        g.setCapability(Capability.BOTH);
        g.setStatus(GarageStatus.APPROVED);
        return garageRepository.save(g);
    }
}
