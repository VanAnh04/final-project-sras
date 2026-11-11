import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Download, 
  Building2, 
  Search, 
  FileText, 
  ShieldCheck, 
  Landmark, 
  Calendar, 
  Check, 
  UserCheck, 
  Wrench, 
  X, 
  MapPin, 
  Phone, 
  User, 
  Eye, 
  ChevronRight, 
  ChevronLeft,
  Smartphone,
  Coins 
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

interface CommissionTxn {
  id: number;
  orderCode: string;
  serviceTitle: string;
  garageName: string;
  garageAvatar?: string;
  grossAmount: number;
  commissionAmount: number;
  commissionRate?: number;
  createdAtText: string;
  createdAt?: string;
  status: string;
  technicianName?: string;
  technicianPhone?: string;
  customerName?: string;
  customerPhone?: string;
  pickupAddress?: string;
  paymentMethod?: string;
  rescueFee?: number;
  towingFee?: number;
  serviceFee?: number;
  employeeShare?: number;
  garageShare?: number;
  travelFee?: number;
  repairFee?: number;
  quoteStatus?: string;
  customerIpAddress?: string;
  deviceId?: string;
  compensationAmount?: number;
  compensationStatus?: string;
  txnType?: 'COMMISSION' | 'COMPENSATION' | string;
  depositRequired?: boolean;
  depositAmount?: number;
  depositStatus?: string;
}

interface FinanceOverview {
  systemBalance: number;
  totalCommission: number;
  totalCompensation?: number;
  commissionRate: number;
  pendingCount: number;
  pendingAmount: number;
  successfulAmount: number;
  transactions: CommissionTxn[];
}

type DateFilterType = 'ALL' | 'DAY' | 'MONTH' | 'YEAR';

export default function FinancePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CommissionTxn | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // ── BỘ LỌC HOA HỒNG & DOANH THU THEO NGÀY / THÁNG / NĂM ──
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('ALL');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // ── BỘ LỌC THEO GARA ĐỐI TÁC ──
  const [selectedGarageFilter, setSelectedGarageFilter] = useState<string>('ALL');

  const [data, setData] = useState<FinanceOverview>({
    systemBalance: 0,
    totalCommission: 0,
    commissionRate: 15,
    pendingCount: 0,
    pendingAmount: 0,
    successfulAmount: 0,
    transactions: []
  });

  const fetchFinanceOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await axiosClient.get('/admin/finance/overview');
      if (res?.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.log('Error fetching admin finance overview:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceOverview();
  }, [fetchFinanceOverview]);

  const handleDownloadCsv = () => {
    // Xuất file CSV danh sách chiết khấu (kèm sep=, để Excel nhận diện chuẩn các cột)
    const header = 'Mã đơn hàng,Dịch vụ,Garage đối tác,Nhân viên cứu hộ,Giá gốc (VND),Hoa hồng hệ thống (VND),Chiết khấu (%),Thời gian,Trạng thái';
    const rows = filteredTxns.map(t => {
      const cRate = t.commissionRate ?? 15;
      const rate = cRate > 1 ? cRate : Math.round(cRate * 100);
      return `"${t.orderCode}","${(t.serviceTitle || '').replace(/"/g, '""')}","${(t.garageName || '').replace(/"/g, '""')}","${(t.technicianName || 'KTV Đối tác').replace(/"/g, '""')}",${t.grossAmount || 0},${t.commissionAmount || 0},"${rate}%","${t.createdAtText || ''}","${t.status || ''}"`;
    });
    const csvContent = '\uFEFFsep=,\r\n' + [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Chiet_Khau_SRAS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg('Đã xuất file CSV thành công!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDownloadExcel = () => {
    // Xuất định dạng Excel Spreadsheet XML (.xls) hiển thị chuẩn theo từng ô, cột, có viền bảng, màu sắc và format tiền tệ
    const escapeXml = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '';
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const rowsXml = filteredTxns.map((t, idx) => {
      const cRate = t.commissionRate ?? 15;
      const rate = cRate > 1 ? cRate : Math.round(cRate * 100);
      const isEven = idx % 2 === 0;
      const textStyle = isEven ? 'RowEven' : 'RowOdd';
      const centerStyle = isEven ? 'CenterEven' : 'CenterOdd';
      const currencyStyle = isEven ? 'CurrencyEven' : 'CurrencyOdd';

      return `
   <Row ss:Height="22">
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(t.orderCode)}</Data></Cell>
    <Cell ss:StyleID="${textStyle}"><Data ss:Type="String">${escapeXml(t.serviceTitle)}</Data></Cell>
    <Cell ss:StyleID="${textStyle}"><Data ss:Type="String">${escapeXml(t.garageName)}</Data></Cell>
    <Cell ss:StyleID="${textStyle}"><Data ss:Type="String">${escapeXml(t.technicianName || 'KTV Đối tác')}</Data></Cell>
    <Cell ss:StyleID="${currencyStyle}"><Data ss:Type="Number">${t.grossAmount || 0}</Data></Cell>
    <Cell ss:StyleID="${currencyStyle}"><Data ss:Type="Number">${t.commissionAmount || 0}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${rate}%</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(t.createdAtText)}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(t.status)}</Data></Cell>
   </Row>`;
    }).join('');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EA580C"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EA580C"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EA580C"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#EA580C" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowEven">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowOdd">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CenterEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CenterOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CurrencyEven">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0\ &quot;₫&quot;"/>
  </Style>
  <Style ss:ID="CurrencyOdd">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0\ &quot;₫&quot;"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="BaoCaoTaiChinh">
  <Table>
   <Column ss:Width="130"/>
   <Column ss:Width="230"/>
   <Column ss:Width="170"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="130"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>
   <Row ss:Height="26" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Mã đơn hàng</Data></Cell>
    <Cell><Data ss:Type="String">Dịch vụ cứu hộ</Data></Cell>
    <Cell><Data ss:Type="String">Garage đối tác</Data></Cell>
    <Cell><Data ss:Type="String">Nhân viên cứu hộ</Data></Cell>
    <Cell><Data ss:Type="String">Giá gốc (VND)</Data></Cell>
    <Cell><Data ss:Type="String">Hoa hồng SRAS (VND)</Data></Cell>
    <Cell><Data ss:Type="String">Chiết khấu (%)</Data></Cell>
    <Cell><Data ss:Type="String">Thời gian</Data></Cell>
    <Cell><Data ss:Type="String">Trạng thái</Data></Cell>
   </Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Tai_Chinh_SRAS_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg('Đã xuất báo cáo Excel thành công!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const formatVnd = (val: number) => {
    return (val || 0).toLocaleString('vi-VN') + 'đ';
  };

  const isWithinDateFilter = (txn: CommissionTxn) => {
    if (dateFilterType === 'ALL') return true;

    let d: Date | null = null;
    if (txn.createdAt) {
      d = new Date(txn.createdAt);
    } else if (txn.createdAtText) {
      const match = txn.createdAtText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
      }
    }

    if (!d || isNaN(d.getTime())) {
      return true;
    }

    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const dy = d.getDate();

    if (dateFilterType === 'DAY') {
      if (!selectedDate) return true;
      const [targetY, targetM, targetD] = selectedDate.split('-').map(Number);
      return yr === targetY && mo === targetM && dy === targetD;
    }

    if (dateFilterType === 'MONTH') {
      return yr === selectedYear && mo === selectedMonth;
    }

    if (dateFilterType === 'YEAR') {
      return yr === selectedYear;
    }

    return true;
  };

  // Danh sách gara độc nhất kèm số lượng đơn để đưa vào dropdown lọc
  const garageOptions = useMemo(() => {
    const map = new Map<string, number>();
    (data.transactions || []).forEach(t => {
      if (t.garageName && t.garageName.trim()) {
        const name = t.garageName.trim();
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [data.transactions]);

  const filteredTxns = useMemo(() => {
    const list = (data.transactions || []).filter(t => {
      if (!isWithinDateFilter(t)) return false;
      if (selectedGarageFilter !== 'ALL' && t.garageName !== selectedGarageFilter) return false;
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        t.orderCode.toLowerCase().includes(s) ||
        t.serviceTitle.toLowerCase().includes(s) ||
        t.garageName.toLowerCase().includes(s) ||
        (t.technicianName && t.technicianName.toLowerCase().includes(s))
      );
    });

    // Sắp xếp lịch sử tài chính: Những giao dịch mới nhất luôn hiện trên đầu
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      // Nếu cùng mốc thời điểm (hoàn tất đơn): ưu tiên COMMISSION (+ chiết khấu) -> DEPOSIT_RELEASE (-50k giải ngân) -> DEPOSIT_HOLD (+50k cọc)
      const priority = (type?: string) => {
        if (type === 'COMMISSION') return 3;
        if (type === 'DEPOSIT_RELEASE') return 2;
        if (type === 'DEPOSIT_HOLD') return 1;
        return 0;
      };
      const pDiff = priority(b.txnType) - priority(a.txnType);
      if (pDiff !== 0) return pDiff;
      return (b.id || 0) - (a.id || 0);
    });
  }, [data.transactions, searchTerm, selectedGarageFilter, dateFilterType, selectedDate, selectedMonth, selectedYear]);

  // Tự động quay về trang 1 khi tìm kiếm hoặc đổi bộ lọc ngày, bộ lọc gara
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilterType, selectedDate, selectedMonth, selectedYear, selectedGarageFilter]);

  // Thống kê hoa hồng & doanh thu theo bộ lọc
  // Chỉ tính các đơn đã thanh toán / hoàn thành (bỏ đơn "Chờ thanh toán") – áp dụng cho cả "Tất cả" lẫn từng kỳ lọc
  const paidFilteredTxns = filteredTxns.filter(t => t.status !== 'Chờ thanh toán');
  const normalPaidTxns = paidFilteredTxns.filter(t => t.txnType !== 'COMPENSATION' && t.txnType !== 'DEPOSIT_HOLD' && t.txnType !== 'DEPOSIT_RELEASE');
  const filteredCommissionSum = paidFilteredTxns.filter(t => t.txnType === 'COMMISSION' || t.txnType === 'COMPENSATION').reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
  const filteredGrossSum = normalPaidTxns.reduce((sum, t) => sum + (t.grossAmount || 0), 0);

  const getFilterPeriodLabel = () => {
    if (dateFilterType === 'DAY') {
      if (!selectedDate) return 'Hôm nay';
      const [y, m, d] = selectedDate.split('-');
      return `Ngày ${d}/${m}/${y}`;
    }
    if (dateFilterType === 'MONTH') {
      return `Tháng ${selectedMonth}/${selectedYear}`;
    }
    if (dateFilterType === 'YEAR') {
      return `Năm ${selectedYear}`;
    }
    return 'Toàn thời gian';
  };

  const totalPages = Math.ceil(filteredTxns.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTxns = filteredTxns.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getCleanCommissionRate = (rate: number | undefined) => {
    if (rate === undefined || rate === null) return 15;
    if (rate <= 1.0) return Math.round(rate * 1000) / 10;
    return rate;
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-700 animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
              <Landmark className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tài chính & Ví hệ thống</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi dòng tiền chiết khấu hợp đồng, số dư hệ thống và đối soát giao dịch tự động
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchFinanceOverview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── BỘ LỌC HOA HỒNG & DOANH THU THEO THỜI GIAN (NGÀY / THÁNG / NĂM) ── */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-gray-900 block">Bộ lọc hoa hồng & doanh thu</span>
            <span className="text-[11px] font-semibold text-gray-400 block">
              Xem báo cáo dòng tiền chiết khấu theo ngày cụ thể, theo tháng hoặc theo năm
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">
          {/* Tabs chọn kiểu lọc */}
          <div className="flex items-center p-1 bg-gray-100/90 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setDateFilterType('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterType === 'ALL'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterType('DAY');
                setSelectedDate(todayStr);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterType === 'DAY'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Theo Ngày
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('MONTH')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterType === 'MONTH'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setDateFilterType('YEAR')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterType === 'YEAR'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Theo Năm
            </button>
          </div>

          {/* Điều khiển tương ứng */}
          {dateFilterType === 'DAY' && (
            <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200/80 px-3 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-orange-900">Chọn ngày:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-orange-200 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="text-[11px] font-extrabold text-orange-600 hover:underline px-1"
              >
                Hôm nay
              </button>
            </div>
          )}

          {dateFilterType === 'MONTH' && (
            <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200/80 px-3 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-orange-900">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-orange-200 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-orange-900">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-orange-200 rounded-xl px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {dateFilterType === 'YEAR' && (
            <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200/80 px-3 py-1.5 rounded-2xl">
              <span className="text-xs font-bold text-orange-900">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-orange-200 rounded-xl px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-2xs"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── 3 CARDS KPI CHUẨN MẪU (CẬP NHẬT THEO BỘ LỌC) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Chờ xử lý */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[12px] font-extrabold text-gray-400 tracking-wider uppercase mb-2">
            CHỜ XỬ LÝ
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">
              {data.pendingAmount.toLocaleString('vi-VN')}
            </span>
            <span className="text-sm font-bold text-gray-500 ml-1">đ</span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {data.pendingCount} đơn cứu hộ đang trong tiến trình
          </p>
        </div>

        {/* Card 2: Tổng hoa hồng */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <p className="text-[12px] font-extrabold text-gray-400 tracking-wider uppercase mb-2">
            {dateFilterType === 'ALL' && selectedGarageFilter === 'ALL'
              ? 'TỔNG HOA HỒNG HỆ THỐNG'
              : `HOA HỒNG (${getFilterPeriodLabel().toUpperCase()}${selectedGarageFilter !== 'ALL' ? ` · ${selectedGarageFilter}` : ''})`}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">
              {filteredCommissionSum.toLocaleString('vi-VN')}
            </span>
            <span className="text-sm font-bold text-gray-500 ml-1">đ</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-orange-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {dateFilterType === 'ALL' && selectedGarageFilter === 'ALL'
                ? 'Theo tỷ lệ chiết khấu từng Garage'
                : `${normalPaidTxns.length} đơn phát sinh hoa hồng`}
            </span>
          </div>
        </div>

        {/* Card 3: Thanh toán thành công / Doanh thu */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[12px] font-extrabold text-gray-400 tracking-wider uppercase mb-2">
            {dateFilterType === 'ALL' && selectedGarageFilter === 'ALL'
              ? 'THANH TOÁN THÀNH CÔNG'
              : `DOANH THU (${getFilterPeriodLabel().toUpperCase()}${selectedGarageFilter !== 'ALL' ? ` · ${selectedGarageFilter}` : ''})`}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">
              {(dateFilterType === 'ALL' && selectedGarageFilter === 'ALL' ? data.successfulAmount : filteredGrossSum).toLocaleString('vi-VN')}
            </span>
            <span className="text-sm font-bold text-gray-500 ml-1">đ</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-gray-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {dateFilterType === 'ALL' && selectedGarageFilter === 'ALL'
                ? `Tổng tiền ${normalPaidTxns.length} đơn đã thanh toán`
                : `Tổng tiền ${normalPaidTxns.length} đơn trong kỳ`}
            </span>
          </div>
        </div>
      </div>

      {/* ── THANH CÔNG CỤ TÌM KIẾM & BÁO CÁO ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">
              Doanh thu đơn cứu hộ & Hoa hồng hệ thống
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-gray-500">Lọc theo Gara:</span>
              <select
                value={selectedGarageFilter}
                onChange={(e) => setSelectedGarageFilter(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-orange-50/70 border border-orange-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/20 hover:border-orange-300 transition-colors cursor-pointer"
              >
                <option value="ALL">Tất cả Gara ({garageOptions.length} đối tác)</option>
                {garageOptions.map(g => (
                  <option key={g.name} value={g.name}>
                    {g.name} ({g.count} đơn)
                  </option>
                ))}
              </select>
              {selectedGarageFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedGarageFilter('ALL')}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline px-1 py-0.5"
                >
                  ✕ Bỏ lọc
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, gara, KTV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold transition-all rounded-xl shadow-xs"
              title="Xuất file Excel (.xls) có kẻ ô, định dạng tiền tệ và màu sắc chuẩn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all rounded-xl shadow-2xs"
              title="Xuất file CSV (đã fix định dạng ô theo cột)"
            >
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TIÊU ĐỀ 2 CỘT KHỚP NHAU ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 px-2">
        <div className="lg:col-span-7">
          <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
            Doanh thu & Chi tiết đơn cứu hộ ({filteredTxns.length} đơn)
          </span>
        </div>
        <div className="lg:col-span-5">
          <span className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">
            Hoa hồng hệ thống thu được
          </span>
        </div>
      </div>

      {/* ── DANH SÁCH KHỚP HÀNG 1:1 (CỘT TRÁI KHỚP HOÀN TOÀN CỘT PHẢI) ── */}
      <div className="space-y-4">
        {loading && filteredTxns.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400 text-sm border border-gray-100 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
            <span>Đang tải dữ liệu tài chính từ hệ thống...</span>
          </div>
        ) : filteredTxns.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400 text-sm border border-gray-100">
            Không tìm thấy đơn cứu hộ nào phù hợp
          </div>
        ) : (
          paginatedTxns.map((item) => {
            const cleanRate = getCleanCommissionRate(item.commissionRate);
            const isCompensation = item.txnType === 'COMPENSATION';
            const isDepositHold = item.txnType === 'DEPOSIT_HOLD';
            const isDepositRelease = item.txnType === 'DEPOSIT_RELEASE';
            const isPaidOrder = item.status === 'Đã thanh toán' || item.status === 'Đã đánh giá' || item.status === 'Đã hoàn thành';
            const compVal = item.compensationAmount || Math.abs(item.commissionAmount || 0);

            return (
              <div 
                key={item.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch bg-white rounded-3xl p-5 border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all shadow-xs"
              >
                {/* ── KHUNG TRÁI (7 PHẦN): DOANH THU & CHI TIẾT ĐƠN CỦA GARA ── */}
                <div 
                  onClick={() => setSelectedOrder(item)}
                  className="lg:col-span-7 flex flex-col justify-between space-y-3.5 pr-0 lg:pr-5 border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 cursor-pointer"
                >
                  {/* Top: Thông tin Gara, Mã đơn, Doanh thu đơn */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {item.garageAvatar ? (
                          <img 
                            src={item.garageAvatar} 
                            alt={item.garageName} 
                            className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-gray-100" 
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-sm ${
                            isCompensation
                              ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white'
                              : isDepositHold
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                : isDepositRelease
                                  ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white'
                                  : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                          }`}>
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {/* Huy hiệu nhỏ nhận diện nghiệp vụ cọc */}
                        {isDepositHold && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs border-2 border-white" title="Sàn tạm giữ cọc">
                            <ShieldCheck className="w-3 h-3" />
                          </div>
                        )}
                        {isDepositRelease && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs border-2 border-white" title="Giải ngân cọc cho Gara">
                            <Coins className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 hover:text-orange-600 transition-colors">
                          {item.garageName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-semibold text-gray-500">
                            {item.orderCode.startsWith('#') ? item.orderCode : '#' + item.orderCode}
                          </span>
                          {isCompensation ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-rose-50 text-rose-700 border-rose-200">
                              ⛽ Bồi hoàn xăng xe
                            </span>
                          ) : isDepositHold ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              🛡️ Sàn tạm giữ cọc
                            </span>
                          ) : isDepositRelease ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-rose-50 text-rose-700 border-rose-200">
                              💸 Giải ngân cọc cho Gara
                            </span>
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isPaidOrder 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {item.status || 'Chờ thanh toán'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-gray-900 tracking-tight">
                        {formatVnd(item.grossAmount)}
                      </p>
                      <span className="text-[11px] font-semibold text-gray-400">
                        {isCompensation ? 'Giá gốc đơn' : isDepositHold ? 'Tiền cọc tạm giữ' : isDepositRelease ? 'Tiền cọc giải ngân' : 'Doanh thu đơn'}
                      </span>
                    </div>
                  </div>

                  {/* Kỹ thuật viên & Dịch vụ cứu hộ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-700 bg-gray-50/80 p-2.5 rounded-xl">
                      <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Kỹ thuật viên</span>
                        <span className="font-bold truncate block">{item.technicianName || 'KTV Đối tác'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-700 bg-gray-50/80 p-2.5 rounded-xl">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">Dịch vụ cứu hộ</span>
                        <span className="font-bold truncate block">{item.serviceTitle.split('@')[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Phân chia 2 bên */}
                  {isCompensation ? (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-rose-50/50 rounded-xl text-center border border-rose-100 text-[11px]">
                      <div className="border-r border-rose-200 pr-2">
                        <span className="text-rose-600 block text-[10px] font-bold">TRỪ VÍ TỔNG SRAS</span>
                        <span className="text-rose-700 font-black text-xs">-{formatVnd(compVal)}</span>
                      </div>
                      <div className="pl-2">
                        <span className="text-emerald-700 block text-[10px] font-bold">GARA THỰC NHẬN</span>
                        <span className="text-emerald-700 font-black text-xs">
                          +{formatVnd(compVal)}
                        </span>
                      </div>
                    </div>
                  ) : isDepositHold ? (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-emerald-50/50 rounded-xl text-center border border-emerald-100 text-[11px]">
                      <div className="border-r border-emerald-200 pr-2">
                        <span className="text-emerald-700 block text-[10px] font-bold">VÍ TỔNG SRAS (TẠM GIỮ)</span>
                        <span className="text-emerald-600 font-black text-xs">+{formatVnd(item.commissionAmount)}</span>
                      </div>
                      <div className="pl-2">
                        <span className="text-gray-400 block text-[10px] font-bold">GARA THỰC NHẬN</span>
                        <span className="text-gray-500 font-black text-xs">0đ (Chờ hoàn tất)</span>
                      </div>
                    </div>
                  ) : isDepositRelease ? (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-rose-50/50 rounded-xl text-center border border-rose-100 text-[11px]">
                      <div className="border-r border-rose-200 pr-2">
                        <span className="text-rose-700 block text-[10px] font-bold">TRÍCH VÍ TỔNG SRAS</span>
                        <span className="text-rose-600 font-black text-xs">-{formatVnd(Math.abs(item.commissionAmount))}</span>
                      </div>
                      <div className="pl-2">
                        <span className="text-emerald-700 block text-[10px] font-bold">GARA THỰC NHẬN</span>
                        <span className="text-emerald-600 font-black text-xs">+{formatVnd(item.grossAmount)}</span>
                      </div>
                    </div>
                  ) : isPaidOrder ? (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-gray-50/80 rounded-xl text-center border border-gray-100 text-[11px]">
                      <div className="border-r border-gray-200 pr-2">
                        <span className="text-gray-400 block text-[10px] font-bold">HOA HỒNG SRAS ({cleanRate}%)</span>
                        <span className="text-emerald-600 font-black text-xs">+{formatVnd(item.commissionAmount)}</span>
                      </div>
                      <div className="pl-2">
                        <span className="text-gray-400 block text-[10px] font-bold">GARA THỰC NHẬN</span>
                        <span className="text-emerald-600 font-black text-xs">
                          +{formatVnd(item.grossAmount - item.commissionAmount)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-amber-50/40 rounded-xl text-center border border-amber-200/60 text-[11px]">
                      <div className="border-r border-amber-200 pr-2">
                        <span className="text-amber-800 block text-[10px] font-bold">HOA HỒNG DỰ KIẾN ({cleanRate}%)</span>
                        <span className="text-amber-600 font-black text-xs">+{formatVnd(item.commissionAmount)}</span>
                      </div>
                      <div className="pl-2">
                        <span className="text-gray-500 block text-[10px] font-bold">GARA DỰ KIẾN NHẬN</span>
                        <span className="text-gray-700 font-black text-xs">
                          +{formatVnd(item.grossAmount - item.commissionAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Nút xem chi tiết modal */}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(item);
                    }}
                    className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem chi tiết phân bổ đơn</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                  </button>
                </div>

                {/* ── KHUNG PHẢI (5 PHẦN): HOA HỒNG / DÒNG TIỀN HỆ THỐNG CỦA CHÍNH ĐƠN ĐÓ ── */}
                <div 
                  onClick={() => setSelectedOrder(item)}
                  className={`lg:col-span-5 rounded-2xl p-4 border transition-all flex flex-col justify-between cursor-pointer ${
                    isCompensation
                      ? 'bg-gradient-to-br from-rose-50/60 via-rose-50/20 to-white border-rose-200 hover:border-rose-300'
                      : isDepositHold
                        ? 'bg-gradient-to-br from-emerald-50/60 via-emerald-50/20 to-white border-emerald-200 hover:border-emerald-300'
                        : isDepositRelease
                          ? 'bg-gradient-to-br from-rose-50/60 via-rose-50/20 to-white border-rose-200 hover:border-rose-300'
                          : isPaidOrder
                            ? 'bg-gradient-to-br from-emerald-50/60 via-emerald-50/20 to-white border-emerald-100 hover:border-emerald-300'
                            : 'bg-gradient-to-br from-amber-50/50 via-amber-50/20 to-white border-amber-200 hover:border-amber-300'
                  }`}
                >
                  {/* Top: Header hoa hồng của đơn này */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                          isCompensation
                            ? 'bg-rose-100 text-rose-700'
                            : isDepositHold
                              ? 'bg-emerald-100 text-emerald-700'
                              : isDepositRelease
                                ? 'bg-rose-100 text-rose-700'
                                : isPaidOrder ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isCompensation ? (
                            <FileText className="w-4 h-4" />
                          ) : isDepositHold ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : isDepositRelease ? (
                            <Coins className="w-4 h-4" />
                          ) : isPaidOrder ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-black text-gray-900 block">
                            Đơn {item.orderCode.startsWith('#') ? item.orderCode : '#' + item.orderCode}
                          </span>
                          <span className={`text-[10px] font-bold ${
                            isCompensation
                              ? 'text-rose-700'
                              : isDepositHold
                                ? 'text-emerald-700'
                                : isDepositRelease
                                  ? 'text-rose-700'
                                  : isPaidOrder ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {isCompensation
                              ? 'Đã trừ Ví tổng'
                              : isDepositHold
                                ? 'Sàn tạm giữ cọc'
                                : isDepositRelease
                                  ? 'Đã giải ngân cho Gara'
                                  : item.status || 'Chờ thanh toán'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isCompensation ? (
                          <>
                            <span className="text-base font-black text-rose-600 block">
                              -{formatVnd(compVal)}
                            </span>
                            <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-rose-200">
                              Hỗ trợ xăng xe
                            </span>
                          </>
                        ) : isDepositHold ? (
                          <>
                            <span className="text-base font-black text-emerald-600 block">
                              +{formatVnd(item.commissionAmount)}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-emerald-200">
                              Tạm giữ tiền cọc
                            </span>
                          </>
                        ) : isDepositRelease ? (
                          <>
                            <span className="text-base font-black text-rose-600 block">
                              -{formatVnd(Math.abs(item.commissionAmount))}
                            </span>
                            <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-rose-200">
                              Giải ngân về ví Gara
                            </span>
                          </>
                        ) : isPaidOrder ? (
                          <>
                            <span className="text-base font-black text-emerald-600 block">
                              +{formatVnd(item.commissionAmount)}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block mt-0.5">
                              Chiết khấu {cleanRate}%
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-black text-amber-600 block">
                              0đ
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 block">
                              (Dự kiến: +{formatVnd(item.commissionAmount)})
                            </span>
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-amber-200">
                              Chiết khấu {cleanRate}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Dịch vụ & Gara nộp */}
                    <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                      isCompensation
                        ? 'bg-white/90 border-rose-100'
                        : isPaidOrder ? 'bg-white/80 border-emerald-100/60' : 'bg-white/90 border-amber-100'
                    }`}>
                      <p className="text-[11px] font-bold text-gray-700 truncate">
                        {item.serviceTitle}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <span>Giá gốc đơn cứu hộ:</span>
                        <strong className="text-gray-900 text-[11px]">{formatVnd(item.grossAmount)}</strong>
                      </div>
                      {isCompensation && (
                        <div className="flex items-center justify-between text-[10px] text-rose-600 pt-1 border-t border-rose-100">
                          <span>Trích xuất từ Ví tổng:</span>
                          <strong className="text-rose-700 text-[11px]">-{formatVnd(compVal)}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer hoa hồng */}
                  <div className={`flex items-center justify-between pt-3 border-t text-[11px] text-gray-500 font-semibold mt-3 ${
                    isCompensation || isDepositRelease
                      ? 'border-rose-100'
                      : (isDepositHold || isPaidOrder) ? 'border-emerald-100/70' : 'border-amber-100'
                  }`}>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Calendar className={`w-3 h-3 ${isCompensation || isDepositRelease ? 'text-rose-600' : (isDepositHold || isPaidOrder) ? 'text-emerald-600' : 'text-amber-600'}`} />
                      {item.createdAtText}
                    </span>
                    {isCompensation ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        Đã trừ Ví tổng Hệ Thống
                      </span>
                    ) : isDepositRelease ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        Đã giải ngân về Ví Gara
                      </span>
                    ) : isDepositHold ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Đã thu vào Ví tổng Hệ Thống
                      </span>
                    ) : isPaidOrder ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Đã ghi nhận Ví Hệ Thống
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        Chờ hoàn tất · Chưa ghi nhận ví
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── THANH PHÂN TRANG (10 ĐƠN / TRANG) ── */}
      {filteredTxns.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Hiển thị <span className="font-bold text-gray-900">{Math.min(filteredTxns.length, startIndex + 1)}</span> đến <span className="font-bold text-gray-900">{Math.min(filteredTxns.length, startIndex + ITEMS_PER_PAGE)}</span> trong tổng số <span className="font-bold text-gray-900">{filteredTxns.length}</span> đơn cứu hộ
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trang trước</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                    currentPage === page
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}


      {/* ── MODAL CHI TIẾT ĐƠN CỨU HỘ KHI NHẤN VÀO ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[28px] max-w-2xl w-full shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal - Fixed at top with smooth rounded corners */}
            <div className="px-6 py-4.5 border-b border-gray-100 flex items-start justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                {selectedOrder.garageAvatar ? (
                  <img 
                    src={selectedOrder.garageAvatar} 
                    alt={selectedOrder.garageName} 
                    className="w-12 h-12 rounded-2xl object-cover border border-gray-100 flex-shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl flex-shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                    Chi tiết đơn cứu hộ {selectedOrder.orderCode}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      selectedOrder.status === 'Chờ thanh toán'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {selectedOrder.status}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Thực hiện: {selectedOrder.createdAtText}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors ml-2"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">

              {/* ── BẢNG PHÂN BỔ DÒNG TIỀN THEO CHIẾT KHẤU GARA & LOẠI PHÍ (CHUẨN CÔNG THỨC) ── */}
              {(() => {
                if (selectedOrder.txnType === 'COMPENSATION') {
                  const comp = selectedOrder.compensationAmount || Math.abs(selectedOrder.commissionAmount || 0);
                  const isBom = selectedOrder.compensationStatus === 'APPROVED';
                  return (
                    <div className="bg-gradient-to-br from-rose-50/60 via-white to-orange-50/50 p-5 rounded-2xl border border-rose-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-3">
                        <div>
                          <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                            <span className="text-rose-600 font-extrabold">⛽ QUY TRÌNH BỒI HOÀN XĂNG XE CHO GARA</span>
                          </h4>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                            Trích từ Ví tổng Hệ Thống SRAS hỗ trợ chi phí di chuyển khi cuốc cứu hộ bị huỷ giữa đường hoặc bom đơn
                          </p>
                        </div>
                        <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 text-rose-700 self-start sm:self-auto">
                          {isBom ? 'Bồi hoàn Bom đơn (Admin duyệt)' : 'Bồi hoàn tự động (Khách huỷ)'}
                        </span>
                      </div>

                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>Đơn cứu hộ này không hoàn tất do khách huỷ hoặc bom đơn sau khi thợ đã di chuyển. Hệ thống đã <strong>trích xuất {formatVnd(comp)} từ Ví tổng Hệ Thống</strong> chuyển thẳng vào ví tiền mặt của Gara đối tác để hỗ trợ hao tổn xăng xe.</span>
                      </div>

                      {/* 2 Khối tóm tắt */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-700 uppercase">
                              1. VÍ TỔNG HỆ THỐNG (TRỪ TIỀN)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                              Đã trích xuất ví
                            </span>
                          </div>
                          <span className="text-xl font-black mt-1 block text-rose-600">
                            -{formatVnd(comp)}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            Xuất quỹ từ Ví tổng Hệ Thống
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase">
                              2. GARA THỰC NHẬN
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              Đã cộng ví tiền mặt
                            </span>
                          </div>
                          <span className="text-xl font-black mt-1 block text-emerald-600">
                            +{formatVnd(comp)}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            Cộng số dư ví tiền mặt Gara
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (selectedOrder.txnType === 'DEPOSIT_HOLD') {
                  return (
                    <div className="bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/50 p-5 rounded-2xl border border-emerald-200 space-y-4">
                      <div className="border-b border-emerald-100 pb-3">
                        <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-600 font-extrabold">QUY TRÌNH TẠM GIỮ TIỀN CỌC CHỐNG BOM ĐƠN</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          Sàn thu cọc trước 50.000đ qua PayOS đối với khách hàng có tiền sử bom đơn và tạm giữ ký quỹ trong Ví tổng Hệ Thống
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Khách hàng <strong>{selectedOrder.customerName}</strong> đã đặt cọc trước <strong>{formatVnd(selectedOrder.grossAmount)}</strong> khi tạo yêu cầu cứu hộ. Tiền đang nằm an toàn trong Ví tổng Hệ Thống (Sàn) để bảo đảm quyền lợi cho Garage. Khi cuốc cứu hộ hoàn tất, Sàn sẽ tự động chuyển hoàn đủ số tiền này về Ví tiền mặt của Garage nhận đơn.</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                          <div>
                            <span className="text-[11px] font-bold text-emerald-700 uppercase block">
                              1. VÍ TỔNG HỆ THỐNG (TẠM GIỮ)
                            </span>
                          </div>
                          <span className="text-xl font-black mt-1 block text-emerald-600">
                            +{formatVnd(selectedOrder.commissionAmount)}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            Ký quỹ trong Ví tổng Hệ Thống
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-500 uppercase">
                              2. GARA ĐỐI TÁC
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                              Chờ hoàn tất đơn
                            </span>
                          </div>
                          <span className="text-xl font-black mt-1 block text-gray-700">
                            0đ (Chờ hoàn tất)
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            Tự động giải ngân sau khi cứu hộ xong
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (selectedOrder.txnType === 'DEPOSIT_RELEASE') {
                  const isDepositComp = selectedOrder.depositStatus === 'COMPENSATED_TO_GARAGE';
                  return (
                    <div className="bg-gradient-to-br from-rose-50/60 via-white to-pink-50/50 p-5 rounded-2xl border border-rose-200 space-y-4">
                      <div className="border-b border-rose-100 pb-3">
                        <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-rose-600" />
                          <span className="text-rose-600 font-extrabold">
                            {isDepositComp ? 'QUY TRÌNH BỒI THƯỜNG TIỀN CỌC CHO GARA' : 'QUY TRÌNH GIẢI NGÂN TIỀN CỌC CHO GARA'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          {isDepositComp
                            ? 'Trích xuất 50.000đ tiền cọc tạm giữ từ Ví tổng Hệ Thống chuyển thẳng vào Ví tiền mặt của Garage do khách hàng huỷ đơn'
                            : 'Trích xuất 50.000đ tiền cọc tạm giữ từ Ví tổng Hệ Thống chuyển thẳng vào Ví tiền mặt của Garage khi đơn hoàn tất'}
                        </p>
                      </div>

                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>
                          {isDepositComp ? (
                            <>Khách hàng đã huỷ đơn sau khi Gara gán nhân viên. Sàn đã <strong>trích xuất {formatVnd(selectedOrder.grossAmount)} từ Ví tổng</strong> chuyển trả về Ví tiền mặt của <strong>{selectedOrder.garageName}</strong> để bồi thường công chuẩn bị/di chuyển của nhân viên.</>
                          ) : (
                            <>Đơn cứu hộ đã hoàn tất thành công. Sàn đã <strong>trích xuất {formatVnd(selectedOrder.grossAmount)} từ Ví tổng</strong> chuyển trả về Ví tiền mặt của <strong>{selectedOrder.garageName}</strong>, đảm bảo Gara nhận đủ 100% doanh thu đơn hàng trước khi tính chiết khấu hoa hồng.</>
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
                          <div>
                            <span className="text-[11px] font-bold text-rose-700 uppercase block">
                              1. VÍ TỔNG HỆ THỐNG (TRÍCH XUẤT)
                            </span>
                          </div>
                          <span className="text-xl font-black mt-1 block text-rose-600">
                            -{formatVnd(Math.abs(selectedOrder.commissionAmount))}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            Xuất quỹ tiền cọc tạm giữ
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase">
                              2. VÍ TIỀN MẶT GARA
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              Đã cộng ví tiền mặt
                            </span>
                          </div>
                          <span className="text-xl font-black mt-1 block text-emerald-600">
                            +{formatVnd(selectedOrder.grossAmount)}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            Cộng vào Ví tiền mặt {selectedOrder.garageName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                const isDeclined = selectedOrder.quoteStatus === 'DECLINED';
                const orderRate = selectedOrder.commissionRate ?? 10;
                const rateRatio = orderRate / 100;
                const gross = isDeclined
                  ? (selectedOrder.rescueFee != null && selectedOrder.rescueFee > 0 ? selectedOrder.rescueFee : (selectedOrder.travelFee ?? 100000))
                  : selectedOrder.grossAmount;
                const comm = isDeclined
                  ? Math.round(gross * rateRatio)
                  : (selectedOrder.commissionAmount || Math.round(gross * rateRatio));
                const garShare = gross - comm;
                const isCash = selectedOrder.paymentMethod === 'CASH';
                const isSelectedPaid = selectedOrder.status !== 'Chờ thanh toán';

                return (
                  <div className="bg-gradient-to-br from-orange-50/60 via-white to-amber-50/50 p-5 rounded-2xl border border-orange-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-100 pb-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                          Quy trình đối soát dòng tiền đơn hàng
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          Phân chia chiết khấu trực tiếp giữa Hệ thống SRAS ({orderRate}%) và Garage Admin ({100 - orderRate}%)
                        </p>
                      </div>
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-orange-100 text-orange-700 self-start sm:self-auto">
                        Chiết khấu Gara: {orderRate}%
                      </span>
                    </div>

                    {/* Cảnh báo đơn từ chối báo giá (không kéo xe, không sửa chữa) */}
                    {isDeclined && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 font-medium">
                        <Clock className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>Khách hàng đã <strong>từ chối báo giá</strong> (không sửa chữa, không kéo xe về gara). Đơn chỉ tính phí kiểm tra xe tại hiện trường <strong>{formatVnd(gross)}</strong>, miễn toàn bộ phí kéo xe và phụ tùng. Hoa hồng hệ thống chỉ tính trên phí kiểm tra xe.</span>
                      </div>
                    )}

                    {/* Cảnh báo đơn chờ thanh toán nếu chưa hoàn thành */}
                    {!isSelectedPaid && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Đơn cứu hộ đang ở trạng thái <strong>Chờ thanh toán</strong>. Hoa hồng sàn và doanh thu gara chưa được ghi nhận vào ví và chỉ được tự động giải ngân sau khi đơn hoàn tất thanh toán.</span>
                      </div>
                    )}

                    {/* 2 Khối tóm tắt: Chiết khấu SRAS & Garage Admin thực nhận */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-700 uppercase">
                            {isSelectedPaid ? `1. HOA HỒNG SRAS (${orderRate}%)` : `1. HOA HỒNG DỰ KIẾN (${orderRate}%)`}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelectedPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isSelectedPaid ? 'Vào System Wallet' : 'Chờ thanh toán'}
                          </span>
                        </div>
                        <span className={`text-xl font-black mt-1 block ${
                          isSelectedPaid ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {isSelectedPaid ? `+${formatVnd(comm)}` : `0đ (Dự kiến +${formatVnd(comm)})`}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5 block">
                          {isSelectedPaid ? `Trích từ tổng đơn ${formatVnd(gross)}` : 'Chưa ghi nhận vào ví hệ thống'}
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-orange-700 uppercase">
                            {isSelectedPaid ? `2. GARA THỰC NHẬN (${100 - orderRate}%)` : `2. GARA DỰ KIẾN NHẬN (${100 - orderRate}%)`}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelectedPaid ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isSelectedPaid ? 'Doanh thu Gara' : 'Chờ thanh toán'}
                          </span>
                        </div>
                        <span className={`text-xl font-black mt-1 block ${
                          isSelectedPaid ? 'text-orange-600' : 'text-gray-700'
                        }`}>
                          {isSelectedPaid ? formatVnd(garShare) : `0đ (Dự kiến +${formatVnd(garShare)})`}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5 block">
                          {isSelectedPaid ? 'Sau khi khấu trừ chiết khấu sàn' : 'Sau khi khách hàng hoàn tất thanh toán'}
                        </span>
                      </div>
                    </div>

                    {/* Giải thích dòng tiền thực tế theo phương thức thanh toán */}
                    <div className="p-3.5 bg-white/90 rounded-2xl border border-gray-100 text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isCash ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isCash ? '💵 Thanh toán Tiền mặt' : '💳 Thanh toán Chuyển khoản (PayOS)'}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500">Cơ chế luân chuyển tiền:</span>
                      </div>

                      {isCash ? (
                        <p className="text-gray-700 leading-relaxed text-[11px]">
                          👉 Khách hàng trả <strong className="text-gray-900">{formatVnd(gross)}</strong> tiền mặt tại chỗ cho kỹ thuật viên. Kỹ thuật viên bàn giao toàn bộ tiền mặt cho Garage Admin. Do Gara giữ 100% tiền mặt, hệ thống tự động <strong className="text-emerald-700">khấu trừ {formatVnd(comm)} ({orderRate}%)</strong> chiết khấu trực tiếp từ Ví Gara nộp về System Wallet {isSelectedPaid ? '' : '(sau khi hoàn tất đơn)'}.
                        </p>
                      ) : (
                        <p className="text-gray-700 leading-relaxed text-[11px]">
                          👉 Khách hàng chuyển khoản PayOS <strong className="text-gray-900">{formatVnd(gross)}</strong> vào hệ thống. Hệ thống trích <strong className="text-emerald-700">{formatVnd(comm)} ({orderRate}%)</strong> vào System Wallet, toàn bộ số tiền còn lại <strong className="text-orange-600">{formatVnd(garShare)}</strong> được cộng trực tiếp vào Ví của Garage Admin {isSelectedPaid ? '' : '(sau khi hoàn tất đơn)'}.
                        </p>
                      )}

                      <div className="pt-1 border-t border-gray-100 text-[10px] text-gray-400 italic">
                        * Nhân viên cứu hộ (KTV) không có ví ứng dụng và không tham gia phân chia ví tự động.
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Chi tiết Gara & Nhân viên cứu hộ */}
              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  Thông tin đơn vị tiếp nhận
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">Gara đối tác:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedOrder.garageAvatar ? (
                        <img 
                          src={selectedOrder.garageAvatar} 
                          alt={selectedOrder.garageName} 
                          className="w-7 h-7 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                      )}
                      <span className="text-gray-900 font-bold text-sm truncate">{selectedOrder.garageName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-400 block font-medium">Kỹ thuật viên cứu hộ:</span>
                    <span className="text-gray-900 font-bold text-sm block mt-0.5">{selectedOrder.technicianName || 'Nguyễn Văn Nam (KTV)'}</span>
                    {selectedOrder.technicianPhone && (
                      <span className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" /> {selectedOrder.technicianPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chi tiết Khách hàng & Địa điểm */}
              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  Khách hàng & Địa chỉ cứu hộ
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">Khách hàng:</span>
                    <span className="text-gray-900 font-bold block mt-0.5">{selectedOrder.customerName || 'Khách hàng SRAS'}</span>
                    {selectedOrder.customerPhone && (
                      <span className="text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" /> {selectedOrder.customerPhone}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-400 block font-medium">Địa chỉ tiếp cận:</span>
                    <span className="text-gray-900 font-semibold flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      {selectedOrder.pickupAddress || 'Đà Nẵng / Quảng Nam'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 pt-1 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                      Mã thiết bị đặt đơn (Cố định):
                    </span>
                    {selectedOrder.deviceId || selectedOrder.customerIpAddress ? (
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 font-bold tracking-wide">
                        {selectedOrder.deviceId || selectedOrder.customerIpAddress}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Chưa ghi nhận</span>
                    )}
                  </div>

                  {selectedOrder.depositRequired && (
                    <div className="sm:col-span-2 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-gray-600 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Tiền cọc chống bom đơn ({formatVnd(selectedOrder.depositAmount || 50000)}):
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${
                          selectedOrder.depositStatus === 'TRANSFERRED_TO_GARAGE' || selectedOrder.depositStatus === 'PAID' || selectedOrder.depositStatus === 'COMPENSATED_TO_GARAGE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : selectedOrder.depositStatus === 'FORFEITED_TO_SYSTEM'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : selectedOrder.depositStatus === 'REFUNDED_TO_WALLET'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {selectedOrder.depositStatus === 'TRANSFERRED_TO_GARAGE'
                          ? 'Đã khấu trừ vào đơn & hoàn trả đủ về Gara'
                          : selectedOrder.depositStatus === 'COMPENSATED_TO_GARAGE'
                            ? 'Đã bồi thường cọc 50.000đ cho Gara (Khách huỷ đơn)'
                            : selectedOrder.depositStatus === 'PAID'
                              ? 'Sàn đang giữ cọc 50.000đ'
                              : selectedOrder.depositStatus === 'FORFEITED_TO_SYSTEM'
                                ? 'Thuộc về sàn (Do khách vi phạm/bom đơn)'
                                : selectedOrder.depositStatus === 'REFUNDED_TO_WALLET'
                                  ? 'Bảo lưu vào tài khoản khách (Huỷ trước xác nhận)'
                                  : 'Chờ nộp cọc'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dịch vụ & Bảng kê chi phí (Minh bạch, rõ ràng, chi tiết từng khoản) */}
              {(() => {
                const isDeclined = selectedOrder.quoteStatus === 'DECLINED';
                const grossTotal = selectedOrder.grossAmount || 0;
                const towing = isDeclined ? 0 : (selectedOrder.towingFee || 0);
                const rescue = isDeclined
                  ? (selectedOrder.rescueFee != null && selectedOrder.rescueFee > 0 ? selectedOrder.rescueFee : (selectedOrder.travelFee ?? grossTotal))
                  : (selectedOrder.rescueFee != null && selectedOrder.rescueFee > 0 ? selectedOrder.rescueFee : (selectedOrder.travelFee ?? 0));

                let repair = 0;
                if (!isDeclined) {
                  if (selectedOrder.repairFee != null && selectedOrder.repairFee > 0) {
                    repair = selectedOrder.repairFee;
                  } else if (selectedOrder.serviceFee != null && selectedOrder.serviceFee > 0) {
                    repair = selectedOrder.serviceFee;
                  } else {
                    repair = Math.max(0, grossTotal - rescue - towing);
                  }
                }

                const getPaymentLabel = (pm?: string) => {
                  if (!pm) return 'Chuyển khoản trực tuyến (PayOS)';
                  const up = pm.toUpperCase();
                  if (up === 'CASH') return '💵 Tiền mặt tại hiện trường';
                  if (up.includes('BANK') || up.includes('PAYOS') || up.includes('ONLINE')) return '💳 Chuyển khoản PayOS (VietQR)';
                  return pm;
                };

                return (
                  <div className="p-4 sm:p-5 rounded-2xl border border-gray-100 bg-white space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-orange-600" />
                        Dịch vụ & Bảng kê chi tiết chi phí
                      </h4>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                        Bảng kê minh bạch
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* Sự cố / Nhu cầu */}
                      <div className="flex justify-between items-start py-1 border-b border-gray-50">
                        <span className="text-gray-500 font-medium">Sự cố / Triệu chứng:</span>
                        <span className="font-bold text-gray-900 text-right max-w-[65%]">
                          {selectedOrder.serviceTitle}
                        </span>
                      </div>

                      {/* 1. Phí tiếp cận & kiểm tra ban đầu */}
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <div>
                          <span className="text-gray-800 font-semibold block">1. Phí tiếp cận & kiểm tra xe tại chỗ:</span>
                          <span className="text-[10.5px] text-gray-400 block">Kỹ thuật viên cơ động đến hiện trường và thẩm định ban đầu</span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">
                          {formatVnd(rescue)}
                        </span>
                      </div>

                      {/* 2. Phí kỹ thuật & sửa chữa */}
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <div>
                          <span className="text-gray-800 font-semibold block">2. Phí dịch vụ kỹ thuật & phụ tùng sửa chữa:</span>
                          <span className="text-[10.5px] text-gray-400 block">
                            {isDeclined ? 'Khách từ chối báo giá sửa chữa' : 'Công thợ xử lý sự cố, vật tư & linh kiện thay thế'}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">
                          {formatVnd(repair)}
                        </span>
                      </div>

                      {/* 3. Phí cẩu / kéo xe (nếu có) */}
                      {towing > 0 && (
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <div>
                            <span className="text-gray-800 font-semibold block">3. Phí cẩu / kéo xe về Gara:</span>
                            <span className="text-[10.5px] text-gray-400 block">Xe cứu hộ chuyên dụng vận chuyển xe về xưởng</span>
                          </div>
                          <span className="font-bold text-gray-900 text-sm">
                            {formatVnd(towing)}
                          </span>
                        </div>
                      )}

                      {/* Hình thức thanh toán */}
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                        <span className="text-gray-500 font-medium">Hình thức thanh toán:</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs">
                          {getPaymentLabel(selectedOrder.paymentMethod)}
                        </span>
                      </div>

                      {/* Highlight Box: Tổng thanh toán */}
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50/60 p-4 rounded-2xl border border-orange-100 flex items-center justify-between mt-2">
                        <div>
                          <span className="text-xs font-black text-gray-900 block">Tổng chi phí thanh toán:</span>
                          <span className="text-[10.5px] text-gray-500 font-medium block">
                            Đã bao gồm toàn bộ phí kiểm tra ({formatVnd(rescue)}) + sửa chữa ({formatVnd(repair)}){towing > 0 ? ` + kéo xe (${formatVnd(towing)})` : ''}
                          </span>
                        </div>
                        <span className="font-black text-orange-600 text-xl">
                          {formatVnd(grossTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer Modal - Fixed at bottom with rounded bottom corners */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end gap-3 flex-shrink-0 rounded-b-[28px]">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-2xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-100 transition-all shadow-2xs"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setToastMsg(`Đã xác thực và đối soát hoàn tất đơn ${selectedOrder.orderCode}`);
                  setSelectedOrder(null);
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                className="px-6 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition-all active:scale-98"
              >
                Xác nhận đối soát
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
