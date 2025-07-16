import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Save, X, ChevronDown, Upload } from 'lucide-react';
import { MenuItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ManageSectionProps {
  menuItems: MenuItem[];
  categories: string[];
  onUpdateMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onAddMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

const ManageSection: React.FC<ManageSectionProps> = ({ 
  menuItems, 
  categories,
  onUpdateMenuItem, 
  onDeleteMenuItem, 
  onAddMenuItem,
  onAddCategory,
  onDeleteCategory
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'menu' | 'categories'>('menu');
  const [newItem, setNewItem] = useState<Omit<MenuItem, 'id'>>({
    name: '',
    price: 0,
    category: 'Appetizers',
    description: '',
    image: '',
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<MenuItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is JPEG
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert('Please upload only JPEG images.');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to resize image to fixed size (300x200)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 300;
        canvas.height = 200;
        
        if (ctx) {
          // Draw image with fixed dimensions
          ctx.drawImage(img, 0, 0, 300, 200);
          
          // Convert to base64 JPEG with quality 0.8
          const resizedImageData = canvas.toDataURL('image/jpeg', 0.8);
          
          if (isEdit && editingData) {
            setEditingData({ ...editingData, image: resizedImageData });
          } else {
            setNewItem({ ...newItem, image: resizedImageData });
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = () => {
    if (newItem.name && newItem.price > 0 && newItem.category) {
      onAddMenuItem(newItem);
      setNewItem({ name: '', price: 0, category: 'Appetizers', description: '', image: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item.id);
    setEditingData({ ...item });
  };

  const handleSaveItem = () => {
    if (editingData) {
      onUpdateMenuItem(editingData);
      setEditingItem(null);
      setEditingData(null);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingData(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDeleteMenuItem(itemToDelete);
      setItemToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  const handleEditCategory = (categoryName: string) => {
    setEditingCategory(categoryName);
    setEditingCategoryName(categoryName);
  };

  const handleUpdateCategory = () => {
    if (editingCategory && editingCategoryName.trim() && editingCategoryName.trim() !== editingCategory) {
      // Update all menu items that use the old category name
      const itemsToUpdate = menuItems.filter(item => item.category === editingCategory);
      itemsToUpdate.forEach(item => {
        onUpdateMenuItem({ ...item, category: editingCategoryName.trim() });
      });
      
      // Delete old category and add new one
      onDeleteCategory(editingCategory);
      onAddCategory(editingCategoryName.trim());
      
      setEditingCategory(null);
      setEditingCategoryName('');
    }
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setEditingCategoryName('');
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    // Check if any menu items use this category
    const itemsInCategory = menuItems.filter(item => item.category === categoryToDelete);
    if (itemsInCategory.length > 0) {
      alert(`Cannot delete category "${categoryToDelete}" because it contains ${itemsInCategory.length} menu item(s).`);
      return;
    }
    
    onDeleteCategory(categoryToDelete);
  };

  const groupedItems = categories.reduce((acc, category) => {
    acc[category] = menuItems.filter(item => item.category === category);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const getCategoryStats = () => {
    return categories.map(category => ({
      name: category,
      translatedName: category, // Don't translate category names, show them as-is
      count: menuItems.filter(item => item.category === category).length,
      totalValue: menuItems
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + item.price, 0)
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 lg:p-6 mb-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-white">{t('manage')}</h2>
          <p className="text-purple-100 text-sm lg:text-base">{t('manageMenuItemsAndCategories')}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 lg:space-x-8 px-4 lg:px-6">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'menu'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('menuItems')}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('categories')}
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'menu' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Menu Item Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-fit">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-lg p-4 lg:p-6">
                <h2 className="text-xl font-bold text-white">{t('addNewMenuItem')}</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">{t('itemName')}</label>
                  <input
                    type="text"
                    placeholder={t('enterItemName')}
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">{t('itemPrice')} (MMK)</label>
                  <input
                    type="number"
                    placeholder={t('enterPrice')}
                    value={newItem.price || ''}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">{t('category')}</label>
                  <div className="relative">
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="w-full px-4 py-3 pr-10 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 appearance-none cursor-pointer hover:border-purple-400"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">{t('description')}</label>
                  <textarea
                    placeholder={t('enterDescription')}
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">{t('uploadImage')} (JPEG only, 300x200px)</label>
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg"
                      onChange={(e) => handleImageUpload(e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors"
                    >
                      <Upload className="h-5 w-5 mr-2 text-gray-400" />
                      <span className="text-gray-600">{t('uploadJPEGImage')}</span>
                    </button>
                    {newItem.image && (
                      <div className="relative">
                        <img
                          src={newItem.image}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          onClick={() => setNewItem({ ...newItem, image: '' })}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleAddItem}
                  disabled={!newItem.name || newItem.price <= 0}
                  className="w-full flex items-center justify-center px-6 py-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {t('addMenuItem')}
                </button>
              </div>
          </div>

          {/* Menu Items Display Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-fit">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg p-4 lg:p-6">
                <h2 className="text-xl font-bold text-white">{t('menuItems')}</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                  {categories.map(category => (
                    groupedItems[category]?.length > 0 && (
                      <div key={category} className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                          {category}
                        </h3>
                        {groupedItems[category].map((item) => (
                          <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            {editingItem === item.id ? (
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={editingData?.name || ''}
                                  onChange={(e) => setEditingData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="number"
                                  value={editingData?.price || 0}
                                  onChange={(e) => setEditingData(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <textarea
                                  value={editingData?.description || ''}
                                  onChange={(e) => setEditingData(prev => prev ? { ...prev, description: e.target.value } : null)}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('updateImage')}</label>
                                  <input
                                    ref={editFileInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg"
                                    onChange={(e) => handleImageUpload(e, true)}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => editFileInputRef.current?.click()}
                                    className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {t('uploadNewImage')}
                                  </button>
                                  {editingData?.image && (
                                    <div className="mt-2 relative">
                                      <img
                                        src={editingData.image}
                                        alt="Preview"
                                        className="w-24 h-16 object-cover rounded border border-gray-300"
                                      />
                                      <button
                                        onClick={() => setEditingData(prev => prev ? { ...prev, image: '' } : null)}
                                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleSaveItem}
                                    className="flex items-center px-3 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    {t('save')}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="flex items-center px-3 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {t('cancel')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex space-x-3">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-16 h-12 object-cover rounded border border-gray-300 flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 text-lg">{item.name}</h4>
                                      <p className="text-sm text-blue-600 font-medium">{item.category}</p>
                                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className="text-xl font-bold text-green-600">MMK {item.price.toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                <div className="flex space-x-2 mt-3">
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="flex items-center px-3 py-2 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    {t('edit')}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item.id)}
                                    className="flex items-center px-3 py-2 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {t('delete')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                  
                  {menuItems.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {t('noMenuItemsFound')}
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>
      ) : (
        /* Categories Management Section */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add New Category Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-fit">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-t-lg p-4 lg:p-6">
              <h2 className="text-xl font-bold text-white">{t('addNewCategory')}</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">{t('categoryName')}</label>
                <input
                  type="text"
                  placeholder={t('enterCategoryName')}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={handleAddCategory}
                disabled={!newCategory.trim() || categories.includes(newCategory.trim())}
                className="w-full flex items-center justify-center px-6 py-3 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('addCategory')}
              </button>
            </div>
          </div>

          {/* Categories List Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 h-fit">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg p-4 lg:p-6">
              <h2 className="text-xl font-bold text-white">{t('categories')} ({categories.length})</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {getCategoryStats().map((category) => (
                  <div key={category.name} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {editingCategory === category.name ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={t('enterCategoryName')}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateCategory}
                            disabled={!editingCategoryName.trim() || editingCategoryName.trim() === category.name}
                            className="flex items-center px-3 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {t('updateCategory')}
                          </button>
                          <button
                            onClick={handleCancelEditCategory}
                            className="flex items-center px-3 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{category.translatedName}</h4>
                          <p className="text-sm text-gray-600">
                            {category.count} {t('items')} • {t('totalValue')}: MMK {category.totalValue.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditCategory(category.name)}
                            className="p-2 text-blue-600 hover:text-blue-700 transition-colors"
                            title={t('editCategory')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.name)}
                            disabled={category.count > 0}
                            className="p-2 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            title={category.count > 0 ? t('cannotDeleteCategoryWithItems') : t('deleteCategory')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('deleteMenuItem')}</h3>
            <p className="text-gray-600 mb-6">
              {t('confirmDeleteMenuItem')} "{menuItems.find(item => item.id === itemToDelete)?.name}"? {t('thisActionCannotBeUndone')}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmDelete}
                className="flex items-center px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSection;