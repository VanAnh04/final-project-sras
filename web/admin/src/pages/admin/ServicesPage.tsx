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
  ChevronRight
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

        <div className="flex items-center gap-3">
          {activeTab === 'SERVICES' ? (
            <button
              onClick={openCreateServiceModal}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tạo Menu Giá & Dịch Vụ
            </button>
          ) : (
            <button
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
    </div>
  );
}
