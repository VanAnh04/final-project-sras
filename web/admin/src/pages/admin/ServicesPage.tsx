import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Tag,
  DollarSign,
  Grid,
  Layers,
  Car,
  Bike,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  UploadCloud,
  AlertTriangle
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export type FeeTypeEnum = 'RESCUE_FEE' | 'TOWING_FEE' | 'SERVICE_FEE';
export type ServiceUnitEnum = 'LAN' | 'KM';
export type CapabilityEnum = 'CAR' | 'MOTORBIKE' | 'BOTH';

interface ServiceCategoryItem {
  id: number;
  name: string;
  code: string;
  vehicleType: CapabilityEnum;
  displayOrder?: number;
  isActive?: boolean;
}

interface ServiceItem {
  id: number;
  categoryId: number;
  categoryName?: string;
  categoryCode?: string;
  name: string;
  code: string;
  feeType: FeeTypeEnum;
  minPrice: number;
  maxPrice: number;
  unit: ServiceUnitEnum;
  isActive?: boolean;
  createdAt?: string;
}

const formatCurrencyInput = (value: string | number) => {
  if (value === undefined || value === null || value === '') return '';
  const digitsOnly = String(value).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('vi-VN');
};

const parseCurrencyInput = (value: string): number => {
  const digitsOnly = String(value).replace(/\D/g, '');
  return digitsOnly ? Number(digitsOnly) : 0;
};

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState<'SERVICES' | 'CATEGORIES'>('SERVICES');
  const [categories, setCategories] = useState<ServiceCategoryItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | 'ALL'>('ALL');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState({
    categoryId: '',
    name: '',
    code: '',
    feeType: 'SERVICE_FEE' as FeeTypeEnum,
    unit: 'LAN' as ServiceUnitEnum,
    minPrice: '',
    maxPrice: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    vehicleType: 'BOTH' as CapabilityEnum,
    displayOrder: 0,
  });

  // Excel Bulk Import & Export State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    successCount: number;
    failureCount: number;
    errors: Array<{
      rowNumber: number;
      serviceCode: string;
      serviceName: string;
      reason: string;
    }>;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/service-categories');
      const apiData = res?.data || res;
      if (Array.isArray(apiData)) {
        setCategories(apiData);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục dịch vụ:', err);
      setCategories([]);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoadingApi(true);
      const params: any = {};
      if (selectedCategoryFilter !== 'ALL') {
        params.categoryId = selectedCategoryFilter;
      }
      const res: any = await axiosClient.get('/services', { params });
      const apiData = res?.data || res;
      if (Array.isArray(apiData)) {
        setServices(apiData);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách dịch vụ:', err);
      setServices([]);
    } finally {
      setIsLoadingApi(false);
    }
  }, [selectedCategoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openCreateServiceModal = () => {
    setEditingService(null);
    setFormError(null);
    setServiceForm({
      categoryId: categories.length > 0 ? String(categories[0].id) : '',
      name: '',
      code: '',
      feeType: 'SERVICE_FEE',
      unit: 'LAN',
      minPrice: '',
      maxPrice: '',
    });
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (item: ServiceItem) => {
    setEditingService(item);
    setFormError(null);
    setServiceForm({
      categoryId: String(item.categoryId),
      name: item.name,
      code: item.code,
      feeType: item.feeType || 'SERVICE_FEE',
      unit: item.unit || 'LAN',
      minPrice: formatCurrencyInput(item.minPrice),
      maxPrice: formatCurrencyInput(item.maxPrice),
    });
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const min = parseCurrencyInput(serviceForm.minPrice);
    const max = parseCurrencyInput(serviceForm.maxPrice);

    if (!serviceForm.categoryId) {
      setFormError('Vui lòng chọn danh mục dịch vụ.');
      return;
    }
    if (!serviceForm.name.trim()) {
      setFormError('Vui lòng nhập tên dịch vụ.');
      return;
    }
    if (!serviceForm.code.trim()) {
      setFormError('Vui lòng nhập mã dịch vụ.');
      return;
    }

    const trimmedName = serviceForm.name.trim().toLowerCase();
    const trimmedCode = serviceForm.code.trim().toUpperCase();

    const duplicateCode = services.find(
      s => s.code.toUpperCase() === trimmedCode && (!editingService || s.id !== editingService.id)
    );
    if (duplicateCode) {
      setFormError(`Mã dịch vụ '${serviceForm.code.trim().toUpperCase()}' đã tồn tại trong hệ thống.`);
      return;
    }

    const duplicateName = services.find(
      s => s.name.trim().toLowerCase() === trimmedName && (!editingService || s.id !== editingService.id)
    );
    if (duplicateName) {
      setFormError(`Tên dịch vụ '${serviceForm.name.trim()}' đã tồn tại trong hệ thống.`);
      return;
    }

    if (isNaN(min) || min < 0) {
      setFormError('Giá tối thiểu phải là số lớn hơn hoặc bằng 0.');
      return;
    }
    if (isNaN(max) || max < 0) {
      setFormError('Giá tối đa phải là số lớn hơn hoặc bằng 0.');
      return;
    }
    if (min > max) {
      setFormError(`RÀNG BUỘC GIÁ KHÔNG HỢP LỆ: Giá tối thiểu (${min.toLocaleString('vi-VN')} ₫) không được lớn hơn giá tối đa (${max.toLocaleString('vi-VN')} ₫)!`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        categoryId: Number(serviceForm.categoryId),
        name: serviceForm.name.trim(),
        code: serviceForm.code.trim().toUpperCase(),
        feeType: serviceForm.feeType,
        unit: serviceForm.unit,
        minPrice: min,
        maxPrice: max,
      };

      if (editingService) {
        await axiosClient.put(`/services/${editingService.id}`, payload);
        showToast(`Đã cập nhật dịch vụ ${serviceForm.name}`);
      } else {
        await axiosClient.post('/services', payload);
        showToast(`Đã tạo dịch vụ và menu giá mới thành công`);
      }

      setIsServiceModalOpen(false);
      fetchServices();
    } catch (err: any) {
      console.error('Lỗi lưu dịch vụ:', err);
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu dịch vụ';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${name}" không?`)) {
      return;
    }
    try {
      await axiosClient.delete(`/services/${id}`);
      showToast(`Đã xóa dịch vụ "${name}"`);
      fetchServices();
    } catch (err) {
      console.error('Lỗi xóa dịch vụ:', err);
      showToast('Có lỗi xảy ra khi xóa dịch vụ');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const res: any = await axiosClient.get('/services/import-template', {
        responseType: 'blob',
      });
      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_nhap_menu_dich_vu_sras.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Đã tải xuống file Excel mẫu thành công');
    } catch (err: any) {
      console.error('Lỗi tải file mẫu:', err);
      showToast('Không thể tải file mẫu Excel');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExportServices = async () => {
    try {
      setIsExporting(true);
      const params: any = {};
      if (selectedCategoryFilter !== 'ALL') {
        params.categoryId = selectedCategoryFilter;
      }
      const res: any = await axiosClient.get('/services/export', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      link.download = `danh_sach_menu_dich_vu_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Đã xuất danh sách dịch vụ ra file Excel thành công!');
    } catch (err: any) {
      console.error('Lỗi xuất file Excel:', err);
      showToast('Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenImportModal = () => {
    setSelectedFile(null);
    setSchemaError(null);
    setImportResult(null);
    setIsImportModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        setSchemaError('Vui lòng chọn file Excel có định dạng .xlsx hoặc .xls');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setSchemaError(null);
      setImportResult(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      setSchemaError('Vui lòng chọn file Excel (.xlsx) trước khi tiến hành.');
      return;
    }

    try {
      setIsUploading(true);
      setSchemaError(null);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res: any = await axiosClient.post('/services/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const apiData = res?.data || res;
      setImportResult(apiData);
      fetchServices();

      if (apiData.successCount > 0) {
        showToast(`Đã thêm thành công ${apiData.successCount} dịch vụ vào hệ thống!`);
      }
    } catch (err: any) {
      console.error('Lỗi khi import file Excel:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xử lý file Excel';
      setSchemaError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', code: '', vehicleType: 'BOTH', displayOrder: 0 });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ServiceCategoryItem) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      code: cat.code,
      vehicleType: cat.vehicleType || 'BOTH',
      displayOrder: cat.displayOrder || 0,
    });
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim() || !categoryForm.code.trim()) {
      alert('Vui lòng điền tên và mã danh mục');
      return;
    }

    const trimmedCatName = categoryForm.name.trim().toLowerCase();
    const trimmedCatCode = categoryForm.code.trim().toUpperCase();

    const duplicateCatCode = categories.find(
      c => c.code.toUpperCase() === trimmedCatCode && (!editingCategory || c.id !== editingCategory.id)
    );
    if (duplicateCatCode) {
      alert(`Mã danh mục '${categoryForm.code.trim().toUpperCase()}' đã tồn tại trong hệ thống.`);
      return;
    }

    const duplicateCatName = categories.find(
      c => c.name.trim().toLowerCase() === trimmedCatName && (!editingCategory || c.id !== editingCategory.id)
    );
    if (duplicateCatName) {
      alert(`Tên danh mục '${categoryForm.name.trim()}' đã tồn tại trong hệ thống.`);
      return;
    }

    try {
      const payload = {
        name: categoryForm.name.trim(),
        code: categoryForm.code.trim().toUpperCase(),
        vehicleType: categoryForm.vehicleType,
        displayOrder: Number(categoryForm.displayOrder || 0),
      };

      if (editingCategory) {
        await axiosClient.put(`/service-categories/${editingCategory.id}`, payload);
        showToast(`Đã cập nhật danh mục "${categoryForm.name}"`);
      } else {
        await axiosClient.post('/service-categories', payload);
        showToast(`Đã tạo danh mục "${categoryForm.name}" thành công`);
      }

      setIsCategoryModalOpen(false);
      fetchCategories();
      fetchServices();
    } catch (err: any) {
      console.error('Lỗi lưu danh mục:', err);
      alert(err?.response?.data?.message || 'Không thể lưu danh mục');
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}" không?`)) {
      return;
    }
    try {
      await axiosClient.delete(`/service-categories/${id}`);
      showToast(`Đã xóa danh mục "${name}"`);
      fetchCategories();
      fetchServices();
    } catch (err) {
      console.error('Lỗi xóa danh mục:', err);
      showToast('Có lỗi xảy ra khi xóa danh mục');
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const paginatedServices = filteredServices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filteredCategories = categories.filter((c) => {
    return (
      c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  });

  const categoryTotalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const paginatedCategories = filteredCategories.slice((categoryPage - 1) * PAGE_SIZE, categoryPage * PAGE_SIZE);

  const getFeeTypeBadge = (feeType: FeeTypeEnum) => {
    switch (feeType) {
      case 'RESCUE_FEE':
        return { label: 'Phí cứu hộ', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'TOWING_FEE':
        return { label: 'Phí kéo xe', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'SERVICE_FEE':
      default:
        return { label: 'Phí dịch vụ', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  const getCapabilityBadge = (cap?: CapabilityEnum) => {
    switch (cap) {
      case 'CAR':
        return { label: 'Chỉ Ô tô (CAR)', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Car };
      case 'MOTORBIKE':
        return { label: 'Chỉ Xe máy (MOTORBIKE)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Bike };
      case 'BOTH':
      default:
        return { label: 'Cả Ô tô & Xe máy (BOTH)', bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: Layers };
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-6 font-sans">
      {toastMessage && (
        <div className="fixed top-24 right-8 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-800 animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Dịch vụ & Bảng giá</h1>
          <p className="text-base font-medium text-gray-500 mt-1.5">
            Quản lý toàn bộ danh mục, menu giá và định nghĩa khung giá sàn - trần cho hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'SERVICES' ? (
            <>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title="Tải về file Excel mẫu chuẩn (.xlsx)"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                ) : (
                  <Download className="w-4 h-4 text-gray-600" />
                )}
                <span>Tải File Mẫu</span>
              </button>

              <button
                type="button"
                onClick={handleExportServices}
                disabled={isExporting}
                className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title="Xuất toàn bộ danh sách dịch vụ và khung giá ra file Excel (.xlsx)"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-600" />
                )}
                <span>Xuất File Excel</span>
              </button>

              <button
                type="button"
                onClick={handleOpenImportModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                title="Thêm dữ liệu hàng loạt từ file Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập Từ Excel</span>
              </button>

              <button
                type="button"
                onClick={openCreateServiceModal}
                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tạo Menu Giá & Dịch Vụ
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openCreateCategoryModal}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Danh Mục
            </button>
          )}
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex items-center border-b border-gray-200 gap-6 pt-1">
        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'SERVICES'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Danh Sách Dịch Vụ & Menu Giá ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`pb-3.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'CATEGORIES'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Quản Lý Danh Mục Dịch Vụ ({categories.length})</span>
        </button>
      </div>

      {/* Main Container Card */}
      {activeTab === 'SERVICES' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs w-full overflow-hidden">
          {/* Filter Controls */}
          <div className="flex-none px-7 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">LỌC DANH MỤC:</span>
              
              <div className="relative">
                <button
                  onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                  className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-700 flex items-center gap-2.5 shadow-2xs transition-all cursor-pointer"
                >
                  <span>
                    {selectedCategoryFilter === 'ALL'
                      ? `Tất cả danh mục (${services.length})`
                      : categories.find((c) => c.id === selectedCategoryFilter)?.name || 'Tất cả danh mục'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCategoryFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryFilterOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-150 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCategoryFilter('ALL');
                        setIsCategoryFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                        selectedCategoryFilter === 'ALL' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Tất cả danh mục ({services.length})
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategoryFilter(cat.id);
                          setIsCategoryFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                          selectedCategoryFilter === cat.id ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã dịch vụ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 w-60 shadow-2xs"
              />
            </div>
          </div>

          {/* Scrollable Table Area */}
          <div className="flex-1 overflow-y-auto min-h-0 relative w-full">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-xs shadow-2xs border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Mã Dịch Vụ</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tên Dịch Vụ</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Danh Mục</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Loại Phí</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Khung Giá Admin (Min – Max)</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn Vị</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-8">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {isLoadingApi ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                      Đang nạp menu giá dịch vụ...
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                      Chưa có dịch vụ nào trong hệ thống. Hãy bấm nút "+ Tạo Menu Giá & Dịch Vụ" ở trên để tạo dịch vụ mới.
                    </td>
                  </tr>
                ) : (
                  paginatedServices.map((item) => {
                    const feeBadge = getFeeTypeBadge(item.feeType);
                    return (
                      <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-5 px-6 font-mono text-xs font-bold text-gray-500">
                          {item.code}
                        </td>

                        <td className="py-5 px-6 text-sm font-extrabold text-gray-900">
                          {item.name}
                        </td>

                        <td className="py-5 px-6 text-xs font-semibold text-gray-600">
                          {item.categoryName || 'Mặc định'}
                        </td>

                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${feeBadge.bg}`}>
                            {feeBadge.label}
                          </span>
                        </td>

                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200/60">
                              {item.minPrice.toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="text-gray-300 font-bold">–</span>
                            <span className="text-sm font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200/60">
                              {item.maxPrice.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        </td>

                        <td className="py-5 px-6">
                          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                            {item.unit === 'KM' ? 'VND / KM' : 'VND / Lần'}
                          </span>
                        </td>

                        <td className="py-5 px-6 text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditServiceModal(item)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
                              title="Sửa khung giá dịch vụ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(item.id, item.name)}
                              className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Xóa dịch vụ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Fixed Footer Pagination for Services */}
          <div className="flex-none px-7 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/40 rounded-b-2xl">
            <div className="text-xs font-medium text-gray-500">
              Hiển thị <span className="font-semibold text-gray-900">{filteredServices.length > 0 ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredServices.length)}` : '0'}</span> của <span className="font-semibold text-gray-900">{filteredServices.length}</span> dịch vụ
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'border border-gray-200 text-gray-700 hover:bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Category Full Management View */
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-200/80 shadow-xs w-full overflow-hidden">
          <div className="flex-none px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Danh Mục Dịch Vụ Trong Hệ Thống</h3>
              <p className="text-xs text-gray-500 font-medium">Quản lý phân loại dịch vụ và cấu hình áp dụng phương tiện</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã danh mục..."
                value={categorySearchQuery}
                onChange={(e) => {
                  setCategorySearchQuery(e.target.value);
                  setCategoryPage(1);
                }}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-orange-500 w-60 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 relative w-full">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-xs shadow-2xs border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Mã Danh Mục</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Tên Danh Mục</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Loại Phương Tiện Áp Dụng (Enum)</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Thứ Tự</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Số Dịch Vụ</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right pr-8">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400 text-sm">
                      {categorySearchQuery ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục dịch vụ nào trong hệ thống.'}
                    </td>
                  </tr>
                ) : (
                  paginatedCategories.map((cat) => {
                    const capBadge = getCapabilityBadge(cat.vehicleType);
                    const CapIcon = capBadge.icon;
                    const serviceCount = services.filter((s) => s.categoryId === cat.id).length;

                    return (
                      <tr key={cat.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="py-5 px-6 font-mono text-xs font-bold text-gray-500">
                          {cat.code}
                        </td>

                        <td className="py-5 px-6 text-base font-extrabold text-gray-900">
                          {cat.name}
                        </td>

                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${capBadge.bg}`}>
                            <CapIcon className="w-3.5 h-3.5" />
                            {capBadge.label}
                          </span>
                        </td>

                        <td className="py-5 px-6 text-center text-xs font-bold text-gray-600">
                          {cat.displayOrder ?? 0}
                        </td>

                        <td className="py-5 px-6 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            {serviceCount} dịch vụ
                          </span>
                        </td>

                        <td className="py-5 px-6 text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditCategoryModal(cat)}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
                              title="Sửa danh mục"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Xóa danh mục"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Fixed Footer Pagination for Categories */}
          <div className="flex-none px-7 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/40 rounded-b-2xl">
            <div className="text-xs font-medium text-gray-500">
              Hiển thị <span className="font-semibold text-gray-900">{filteredCategories.length > 0 ? `${(categoryPage - 1) * PAGE_SIZE + 1}–${Math.min(categoryPage * PAGE_SIZE, filteredCategories.length)}` : '0'}</span> của <span className="font-semibold text-gray-900">{filteredCategories.length}</span> danh mục
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                disabled={categoryPage === 1}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: categoryTotalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCategoryPage(pageNum)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
                      categoryPage === pageNum
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'border border-gray-200 text-gray-700 hover:bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCategoryPage((p) => Math.min(categoryTotalPages, p + 1))}
                disabled={categoryPage >= categoryTotalPages}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service & Price Band Modal (Create / Update) */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                    {editingService ? 'Cập nhật Menu Giá Dịch Vụ' : 'Tạo Menu Giá & Dịch Vụ Mới'}
                  </h3>
                  <p className="text-xs font-medium text-gray-500">Quy định khung giá tối thiểu - tối đa cho hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{formError}</div>
              </div>
            )}

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Danh mục dịch vụ:
                  </label>
                  <select
                    value={serviceForm.categoryId}
                    onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-orange-500"
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Tên dịch vụ:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Vá lốp ô tô lưu động"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Mã dịch vụ (Code):
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingService}
                    placeholder="VD: TIRE_REPAIR_CAR"
                    value={serviceForm.code}
                    onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 uppercase placeholder:text-gray-400 focus:outline-none focus:border-orange-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Loại phí (FeeType Enum):
                  </label>
                  <select
                    value={serviceForm.feeType}
                    onChange={(e) => setServiceForm({ ...serviceForm, feeType: e.target.value as FeeTypeEnum })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-orange-500"
                  >
                    <option value="SERVICE_FEE">Phí dịch vụ sửa chữa (SERVICE_FEE)</option>
                    <option value="RESCUE_FEE">Phí công cứu hộ (RESCUE_FEE)</option>
                    <option value="TOWING_FEE">Phí cẩu / kéo xe (TOWING_FEE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Đơn vị tính (ServiceUnit Enum):
                  </label>
                  <select
                    value={serviceForm.unit}
                    onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value as ServiceUnitEnum })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-orange-500"
                  >
                    <option value="LAN">Tính theo Lần / Lượt (LAN)</option>
                    <option value="KM">Tính theo Kilômét (KM)</option>
                  </select>
                </div>

                {/* Price Band Constraints Input */}
                <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 sm:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-orange-700 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-orange-600" />
                    <span>RÀNG BUỘC KHUNG GIÁ QUY ĐỊNH (MIN ≤ MAX)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                        Giá tối thiểu (Min Price ₫):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 100.000"
                        value={serviceForm.minPrice}
                        onChange={(e) => setServiceForm({ ...serviceForm, minPrice: formatCurrencyInput(e.target.value) })}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm font-extrabold text-orange-600 focus:outline-none focus:border-orange-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                        Giá tối đa (Max Price ₫):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 500.000"
                        value={serviceForm.maxPrice}
                        onChange={(e) => setServiceForm({ ...serviceForm, maxPrice: formatCurrencyInput(e.target.value) })}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm font-extrabold text-orange-600 focus:outline-none focus:border-orange-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingService ? 'Lưu thay đổi' : 'Tạo Menu Giá & Dịch Vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal (Create & Update) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-gray-900 font-extrabold text-lg">
                <Tag className="w-5 h-5 text-orange-600" />
                <span>{editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Tạo Danh Mục Dịch Vụ Mới'}</span>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Tên danh mục:
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cứu hộ khẩn cấp ô tô"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Mã danh mục (Code):
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCategory}
                  placeholder="VD: RESCUE_CAR"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 uppercase focus:outline-none focus:border-orange-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Loại phương tiện áp dụng (Capability Enum):
                </label>
                <select
                  value={categoryForm.vehicleType}
                  onChange={(e) => setCategoryForm({ ...categoryForm, vehicleType: e.target.value as CapabilityEnum })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 bg-gray-50 focus:outline-none focus:border-orange-500"
                >
                  <option value="BOTH">Cả Ô tô và Xe máy (BOTH)</option>
                  <option value="CAR">Chỉ Xe ô tô (CAR)</option>
                  <option value="MOTORBIKE">Chỉ Xe máy (MOTORBIKE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Thứ tự hiển thị:
                </label>
                <input
                  type="number"
                  value={categoryForm.displayOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-xs cursor-pointer"
                >
                  {editingCategory ? 'Lưu Thay Đổi' : 'Tạo Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL NHẬP DỮ LIỆU EXCEL ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    Thêm Dữ Liệu Hàng Loạt Bằng Excel
                  </h3>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">
                    Kiểm tra cấu trúc nghiêm ngặt (Validation Schema) & xử lý trùng lặp tự động
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-150px)]">
              {/* Bước 1: Tải file mẫu */}
              <div className="p-4.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Tải file mẫu Excel chuẩn (.xlsx)</h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Có sẵn Dropdown chọn trực tiếp Danh mục (tên + mã), Loại phí, Đơn vị tính và dữ liệu mẫu chuẩn (đã bỏ cột ghi chú).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-60"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Tải File Mẫu Chuẩn</span>
                </button>
              </div>

              {/* Bước 2: Chọn file tải lên */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-gray-900 text-white text-[11px] inline-flex items-center justify-center font-bold">2</span>
                  <span>Chọn file Excel dữ liệu cần import (*.xlsx):</span>
                </label>

                <div className="relative border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 transition-all text-center bg-gray-50/50 hover:bg-emerald-50/20 group">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900 truncate max-w-xs">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 font-medium">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Bấm để chọn lại file khác
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          Kéo & thả file Excel vào đây, hoặc <span className="text-emerald-600 underline">bấm để chọn</span>
                        </p>
                        <p className="text-xs text-gray-400 font-medium mt-1">
                          Hỗ trợ định dạng .xlsx, .xls (Dung lượng tối đa 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lỗi cấu trúc Schema (Validation Schema Failed) */}
              {schemaError && (
                <div className="p-4.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-black text-sm text-rose-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>LỖI CẤU TRÚC FILE (VALIDATION SCHEMA THẤT BẠI)</span>
                  </div>
                  <p className="text-xs font-semibold text-rose-700 leading-relaxed pl-6">
                    {schemaError}
                  </p>
                  <div className="pl-6 pt-1 text-[11px] font-bold text-rose-600 uppercase tracking-wide">
                    ⚠️ Quá trình đã dừng lại. KHÔNG có bản ghi nào được lưu vào Database.
                  </div>
                </div>
              )}

              {/* Báo cáo kết quả xử lý (Report/Response) */}
              {importResult && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                      Báo Cáo Kết Quả Nhập Dữ Liệu:
                    </h4>
                    <span className="text-xs font-bold text-gray-500">
                      Tổng số dòng đọc được: {importResult.totalRows}
                    </span>
                  </div>

                  {/* 3 Thẻ thống kê */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-center">
                      <p className="text-xs font-bold text-blue-600">Tổng Số Dòng</p>
                      <p className="text-2xl font-black text-blue-900 mt-1">{importResult.totalRows}</p>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                      <p className="text-xs font-bold text-emerald-600">Thành Công</p>
                      <p className="text-2xl font-black text-emerald-900 mt-1">{importResult.successCount}</p>
                    </div>

                    <div className={`p-3.5 rounded-2xl border text-center ${
                      importResult.failureCount > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                      <p className={`text-xs font-bold ${importResult.failureCount > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                        Lỗi / Bỏ Qua
                      </p>
                      <p className="text-2xl font-black mt-1">{importResult.failureCount}</p>
                    </div>
                  </div>

                  {/* Trường hợp thành công toàn bộ */}
                  {importResult.failureCount === 0 && importResult.successCount > 0 && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold">
                        Tuyệt vời! Toàn bộ {importResult.successCount} dịch vụ đã được thêm thành công vào hệ thống.
                      </p>
                    </div>
                  )}

                  {/* Danh sách các dòng bị lỗi / trùng lặp */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>Chi tiết các dòng bị lỗi hoặc trùng lặp ({importResult.errors.length} dòng):</span>
                        <span className="text-gray-400 font-normal">(Hệ thống đã bỏ qua và tiếp tục thêm các dòng hợp lệ)</span>
                      </div>

                      <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0">
                            <tr>
                              <th className="py-2.5 px-3 border-b border-gray-200 w-16 text-center">Dòng</th>
                              <th className="py-2.5 px-3 border-b border-gray-200 w-32">Mã Dịch Vụ</th>
                              <th className="py-2.5 px-3 border-b border-gray-200 w-36">Tên Dịch Vụ</th>
                              <th className="py-2.5 px-3 border-b border-gray-200 text-rose-700">Nguyên Nhân Lỗi / Trùng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {importResult.errors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-rose-50/40 transition-colors">
                                <td className="py-2 px-3 text-center font-bold text-gray-600 bg-gray-50/50">
                                  #{err.rowNumber}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-gray-900">
                                  {err.serviceCode || '—'}
                                </td>
                                <td className="py-2 px-3 text-gray-800">
                                  {err.serviceName || '—'}
                                </td>
                                <td className="py-2 px-3 text-rose-700 font-semibold">
                                  {err.reason}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {importResult ? 'Đóng Báo Cáo' : 'Hủy Bỏ'}
              </button>

              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isUploading || !selectedFile}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang Kiểm Tra & Nhập Dữ Liệu...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{importResult ? 'Nhập Lại File Khác' : 'Tiến Hành Nhập Dữ Liệu'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
