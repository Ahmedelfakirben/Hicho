import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, ScanBarcode, Lock, Sparkles, Printer, RefreshCw } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { BarcodeLabelModal, LabelSizeItem } from './BarcodeLabelModal';

interface ProductSize {
    id: string;
    product_id: string;
    size_name: string;
    stock: number;
    barcode?: string;
    price_modifier: number;
}

interface ProductDetails {
    id: string;
    name: string;
    base_price?: number;
    promo_price?: number;
    brand?: string;
    barcode?: string;
}

interface IndividualUnitsManagerProps {
    productId: string;
    productName: string;
    totalStock?: number; // Kept for interface compatibility
    product?: ProductDetails;
    onClose?: () => void;
}

export default function IndividualUnitsManager({ productId, productName, product: initialProduct }: IndividualUnitsManagerProps) {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const isCashier = profile?.role === 'cashier';
    const [sizes, setSizes] = useState<ProductSize[]>([]);
    const [productDetails, setProductDetails] = useState<ProductDetails>(initialProduct || {
        id: productId,
        name: productName,
    });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Label modal state
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [selectedSizeForPrint, setSelectedSizeForPrint] = useState<string | undefined>(undefined);

    // Utility: Generate unique numeric 12-digit barcode
    const generateBarcode = () => {
        const timePart = Date.now().toString().slice(-6);
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `20${timePart}${randomPart}`;
    };

    // Auxiliar para registrar movimientos de stock
    const logStockMovement = async (pId: string, quantity: number, type: 'manual_add' | 'manual_deduct' | 'sale' | 'return' | 'correction', sizeId?: string, reason?: string) => {
        if (quantity === 0) return;
        try {
            await supabase.from('stock_movements').insert({
                product_id: pId,
                size_id: sizeId,
                quantity,
                type,
                reason: reason || '',
                employee_id: profile?.id
            });
        } catch (err) {
            console.error('Error logging stock movement:', err);
        }
    };

    // New Size State
    const [newSizeName, setNewSizeName] = useState('');
    const [newSizeStock, setNewSizeStock] = useState('0');
    const [newSizeBarcode, setNewSizeBarcode] = useState('');

    // Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const [scanTargetField, setScanTargetField] = useState<'new' | string>('new'); // 'new' or sizeId

    useEffect(() => {
        fetchData();
    }, [productId]);

    const fetchData = async () => {
        try {
            // Fetch product details for pricing & barcode
            const { data: prodData } = await supabase
                .from('products')
                .select('id, name, base_price, promo_price, brand, barcode')
                .eq('id', productId)
                .single();

            if (prodData) {
                setProductDetails(prodData);
            }

            // Fetch sizes
            const { data, error } = await supabase
                .from('product_sizes')
                .select('*')
                .eq('product_id', productId)
                .order('size_name');

            if (error) throw error;
            setSizes(data || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error(t('Error al cargar datos del producto'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddSize = async () => {
        if (!newSizeName.trim()) {
            toast.error(t('Nombre de talla obligatorio'));
            return;
        }

        const stockVal = isCashier ? 0 : parseInt(newSizeStock);
        if (!isCashier && (isNaN(stockVal) || stockVal < 0)) {
            toast.error(t('Stock inválido'));
            return;
        }

        setProcessing(true);
        try {
            // Check duplications locally for name
            if (sizes.some(s => s.size_name.toLowerCase() === newSizeName.trim().toLowerCase())) {
                toast.error(t('Ya existe una talla con ese nombre'));
                setProcessing(false);
                return;
            }

            // If no barcode provided, generate one automatically for this unit!
            const finalBarcode = newSizeBarcode.trim() || generateBarcode();

            const { data, error } = await supabase
                .from('product_sizes')
                .insert({
                    product_id: productId,
                    size_name: newSizeName.trim(),
                    stock: stockVal,
                    barcode: finalBarcode,
                    price_modifier: 0
                })
                .select()
                .single();

            if (error) throw error;

            setSizes([...sizes, data]);
            // Reset form
            setNewSizeName('');
            setNewSizeStock('0');
            setNewSizeBarcode('');
            toast.success(t('Talla agregada con código: ') + finalBarcode);

            // Registrar movimiento inicial
            if (stockVal > 0) {
                await logStockMovement(productId, stockVal, 'manual_add', data.id, t('Stock inicial de talla'));
            }
        } catch (error: any) {
            console.error('Error adding size:', error);
            toast.error(t('Error al agregar talla'));
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteSize = async (sizeId: string) => {
        if (!confirm(t('¿Estás seguro de eliminar esta talla?'))) return;

        try {
            const sizeToDelete = sizes.find(s => s.id === sizeId);
            
            const { error } = await supabase
                .from('product_sizes')
                .delete()
                .eq('id', sizeId);

            if (error) throw error;

            // Registrar la eliminación en el historial si tenía stock
            if (sizeToDelete && sizeToDelete.stock > 0) {
                await logStockMovement(productId, -sizeToDelete.stock, 'manual_deduct', undefined, `${t('Talla eliminada')}: ${sizeToDelete.size_name}`);
            }

            setSizes(sizes.filter(s => s.id !== sizeId));
            toast.success(t('Talla eliminada'));
        } catch (error) {
            console.error('Error deleting size:', error);
            toast.error(t('Error al eliminar talla'));
        }
    };

    const handleUpdateSize = async (sizeId: string, updates: Partial<ProductSize>) => {
        try {
            const { error } = await supabase
                .from('product_sizes')
                .update(updates)
                .eq('id', sizeId);

            if (error) throw error;

            // Registrar movimiento si el stock cambió
            if (updates.stock !== undefined) {
                const oldSize = sizes.find(s => s.id === sizeId);
                const diff = updates.stock - (oldSize?.stock || 0);
                if (diff !== 0) {
                    await logStockMovement(productId, diff, diff > 0 ? 'manual_add' : 'manual_deduct', sizeId, t('Actualización manual de stock'));
                }
            }

            setSizes(sizes.map(s => s.id === sizeId ? { ...s, ...updates } : s));
            toast.success(t('Actualizado'));
        } catch (err) {
            console.error('Error updating size:', err);
            toast.error(t('Error al actualizar'));
            fetchData(); // Revert on error
        }
    };

    // Generate barcode for a specific size
    const handleGenerateBarcodeForSize = async (sizeId: string) => {
        const newCode = generateBarcode();
        await handleUpdateSize(sizeId, { barcode: newCode });
        toast.success(t('Código generado: ') + newCode);
    };

    // Generate barcodes for ALL sizes without barcode
    const handleGenerateAllMissingBarcodes = async () => {
        setProcessing(true);
        try {
            const missing = sizes.filter(s => !s.barcode || s.barcode.trim() === '');
            if (missing.length === 0) {
                toast.success(t('Todas las tallas ya tienen código de barras'));
                return;
            }

            const updatedSizes = [...sizes];
            for (const s of missing) {
                const newCode = generateBarcode();
                await supabase
                    .from('product_sizes')
                    .update({ barcode: newCode })
                    .eq('id', s.id);
                
                const idx = updatedSizes.findIndex(item => item.id === s.id);
                if (idx >= 0) {
                    updatedSizes[idx] = { ...updatedSizes[idx], barcode: newCode };
                }
            }

            setSizes(updatedSizes);
            toast.success(t(`¡Generados ${missing.length} códigos de barras nuevos!`));
        } catch (err) {
            console.error('Error generating all barcodes:', err);
            toast.error(t('Error al generar códigos'));
        } finally {
            setProcessing(false);
        }
    };

    const handleScanSuccess = (code: string) => {
        setShowScanner(false);
        if (scanTargetField === 'new') {
            setNewSizeBarcode(code);
        } else {
            handleUpdateSize(scanTargetField, { barcode: code });
        }
        toast.success(t('Código escaneado: ') + code);
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>;
    }

    const missingBarcodesCount = sizes.filter(s => !s.barcode || s.barcode.trim() === '').length;

    return (
        <div className="space-y-6">
            {/* Header banner with Actions */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-bold text-amber-950 text-base">{productName}</h3>
                    <p className="text-xs text-amber-800">{t('Gestión Rápida de Stock y Códigos de Barras')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {missingBarcodesCount > 0 && (
                        <button
                            type="button"
                            onClick={handleGenerateAllMissingBarcodes}
                            disabled={processing}
                            className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                            title={t('Generar códigos automáticamente para las unidades que no tienen')}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            {t(`Generar ${missingBarcodesCount} Códigos`)}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedSizeForPrint(undefined);
                            setShowLabelModal(true);
                        }}
                        disabled={sizes.length === 0}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        title={t('Imprimir etiquetas adhesivas con código de barras para las prendas')}
                    >
                        <Printer className="w-4 h-4" />
                        {t('Imprimir Etiquetas')}
                    </button>
                </div>
            </div>

            {/* Cashier restriction banner */}
            {isCashier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-blue-800">
                    <Lock className="w-4 h-4 flex-shrink-0 text-blue-600" />
                    <span>{t('Puedes añadir tallas y editar códigos de barras. La edición de cantidad de stock requiere permisos de administrador.')}</span>
                </div>
            )}

            {/* Add New Size Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold mb-3 text-gray-800 text-sm flex items-center justify-between">
                    <span>{t('Agregar Nueva Talla')}</span>
                    <span className="text-[11px] text-gray-400 font-normal">{t('Si dejas el código vacío, se generará uno automáticamente')}</span>
                </h4>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('Nombre (ej: XL)')}</label>
                        <input
                            type="text"
                            value={newSizeName}
                            onChange={e => setNewSizeName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                            placeholder="XL"
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('Stock')}</label>
                        <input
                            type="number"
                            value={isCashier ? '0' : newSizeStock}
                            disabled={isCashier}
                            onChange={e => setNewSizeStock(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-75 text-sm"
                            title={isCashier ? t('No tienes permisos para modificar stock') : ''}
                            min="0"
                        />
                    </div>
                    <div className="flex-1 w-full relative">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('Código de Barras')}</label>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={newSizeBarcode}
                                onChange={e => setNewSizeBarcode(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                                placeholder={t('Automático si está vacío')}
                            />
                            <button
                                type="button"
                                onClick={() => setNewSizeBarcode(generateBarcode())}
                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
                                title={t('Generar código de barras')}
                            >
                                <Sparkles className="w-4 h-4 text-amber-600" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setScanTargetField('new');
                                    setShowScanner(true);
                                }}
                                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 flex-shrink-0"
                                title={t('Escanear')}
                            >
                                <ScanBarcode className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleAddSize}
                        disabled={processing || !newSizeName.trim()}
                        className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-[42px] font-bold text-sm shadow-sm transition-all flex-shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        {t('Agregar')}
                    </button>
                </div>
            </div>

            {/* Sizes List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="font-semibold text-gray-700 text-sm">{t('Tallas Existentes')}</h4>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                        {sizes.length} {t('tallas')}
                    </span>
                </div>

                {sizes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic">{t('No hay tallas registradas para este producto')}</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sizes.map(size => (
                            <div key={size.id} className="p-3.5 flex flex-col md:flex-row items-center gap-3 hover:bg-gray-50 transition-colors">
                                {/* Name */}
                                <div className="w-24 font-bold text-center md:text-left bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 shadow-2xs">
                                    {size.size_name}
                                </div>

                                {/* Stock Control */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 uppercase font-bold">{t('Stock')}:</span>
                                    <input
                                        type="number"
                                        defaultValue={size.stock}
                                        disabled={isCashier}
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val !== size.stock) {
                                                handleUpdateSize(size.id, { stock: val });
                                            }
                                        }}
                                        className="w-20 px-2 py-1 border rounded-lg text-center font-mono font-bold text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-75 focus:ring-2 focus:ring-amber-500"
                                        title={isCashier ? t('No tienes permisos para editar stock') : ''}
                                    />
                                </div>

                                {/* Barcode Control */}
                                <div className="flex-1 w-full flex items-center gap-2">
                                    <span className="text-xs text-gray-500 uppercase font-bold whitespace-nowrap">{t('Código')}:</span>
                                    <div className="flex-1 flex gap-1.5 items-center">
                                        <input
                                            type="text"
                                            value={size.barcode || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSizes(sizes.map(s => s.id === size.id ? { ...s, barcode: val } : s));
                                            }}
                                            onBlur={(e) => {
                                                const val = e.target.value.trim() || null;
                                                handleUpdateSize(size.id, { barcode: val as string });
                                            }}
                                            placeholder={t('Sin código')}
                                            className="w-full px-2.5 py-1 border rounded-lg font-mono text-xs text-gray-700 focus:text-black focus:ring-2 focus:ring-amber-500"
                                        />
                                        
                                        {/* Generate barcode button if missing */}
                                        {!size.barcode && (
                                            <button
                                                type="button"
                                                onClick={() => handleGenerateBarcodeForSize(size.id)}
                                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                                                title={t('Generar código de barras')}
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                                {t('Generar')}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setScanTargetField(size.id);
                                                setShowScanner(true);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                            title={t('Escanear')}
                                        >
                                            <ScanBarcode className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Individual Print Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSizeForPrint(size.id);
                                        setShowLabelModal(true);
                                    }}
                                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                    title={t('Imprimir etiquetas para esta talla')}
                                >
                                    <Printer className="w-4 h-4 text-amber-600" />
                                </button>

                                {/* Delete — admin only */}
                                {!isCashier && (
                                    <button
                                        onClick={() => handleDeleteSize(size.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title={t('Eliminar')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Barcode Label Print Modal */}
            {showLabelModal && (
                <BarcodeLabelModal
                    isOpen={showLabelModal}
                    onClose={() => setShowLabelModal(false)}
                    product={productDetails}
                    sizes={sizes}
                    initialSelectedSizeId={selectedSizeForPrint}
                    onUpdateSizeBarcode={async (sizeId, newBarcode) => {
                        await handleUpdateSize(sizeId, { barcode: newBarcode });
                    }}
                />
            )}
        </div>
    );
}
