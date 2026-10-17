import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Plus, Minus, Sparkles, Tag, Check, RefreshCw } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface LabelSizeItem {
  id: string;
  size_name: string;
  stock: number;
  barcode?: string;
  price_modifier?: number;
}

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    base_price?: number;
    promo_price?: number;
    brand?: string;
    barcode?: string;
  };
  sizes: LabelSizeItem[];
  onUpdateSizeBarcode?: (sizeId: string, barcode: string) => Promise<void>;
  initialSelectedSizeId?: string;
}

export function BarcodeLabelModal({
  isOpen,
  onClose,
  product,
  sizes,
  onUpdateSizeBarcode,
  initialSelectedSizeId,
}: BarcodeLabelModalProps) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  // Print quantities per size ID
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [companyName, setCompanyName] = useState('Linventory');
  const [labelSize, setLabelSize] = useState<'standard' | 'small' | 'large'>('standard');
  const [generatingForSize, setGeneratingForSize] = useState<string | null>(null);

  const previewSvgRef = useRef<SVGSVGElement>(null);

  // Initialize quantities based on stock
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      sizes.forEach((s) => {
        if (initialSelectedSizeId) {
          // If a specific size was clicked, set that to stock (or 1) and others to 0
          initial[s.id] = s.id === initialSelectedSizeId ? Math.max(1, s.stock || 1) : 0;
        } else {
          // Otherwise, set to current stock (minimum 1 if stock is 0 so they can print test)
          initial[s.id] = s.stock > 0 ? s.stock : 1;
        }
      });
      setQuantities(initial);

      if (initialSelectedSizeId) {
        const foundIdx = sizes.findIndex((s) => s.id === initialSelectedSizeId);
        if (foundIdx >= 0) setSelectedPreviewIndex(foundIdx);
      } else {
        setSelectedPreviewIndex(0);
      }

      // Fetch company name
      supabase
        .from('company_settings')
        .select('company_name')
        .single()
        .then(({ data }) => {
          if (data?.company_name) setCompanyName(data.company_name);
        });
    }
  }, [isOpen, sizes, initialSelectedSizeId]);

  // Total labels to print
  const totalLabels = Object.values(quantities).reduce((a, b) => a + (b || 0), 0);

  // Current preview item
  const currentPreview = sizes[selectedPreviewIndex] || sizes[0];

  // Helper: Effective price
  const effectivePrice = (product.promo_price && product.promo_price > 0)
    ? product.promo_price
    : (product.base_price || 0);

  const itemPrice = effectivePrice + (currentPreview?.price_modifier || 0);

  // Render preview barcode
  useEffect(() => {
    if (previewSvgRef.current && currentPreview) {
      const code = currentPreview.barcode || product.barcode || 'SIN-CODIGO';
      try {
        JsBarcode(previewSvgRef.current, code, {
          format: 'CODE128',
          width: 1.6,
          height: 38,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          margin: 4,
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Error rendering barcode in preview:', err);
      }
    }
  }, [currentPreview, product.barcode]);

  // Generate unique barcode utility
  const generateBarcode = () => {
    const timePart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `20${timePart}${randomPart}`;
  };

  const handleGenerateBarcodeForSize = async (sizeId: string) => {
    setGeneratingForSize(sizeId);
    try {
      const newCode = generateBarcode();
      if (onUpdateSizeBarcode) {
        await onUpdateSizeBarcode(sizeId, newCode);
      } else {
        await supabase
          .from('product_sizes')
          .update({ barcode: newCode })
          .eq('id', sizeId);
      }
      toast.success(t('Código generado: ') + newCode);
    } catch (err) {
      console.error('Error generating barcode:', err);
      toast.error(t('Error al generar código'));
    } finally {
      setGeneratingForSize(null);
    }
  };

  // Generate SVG string for printing
  const getBarcodeSvgString = (code: string): string => {
    try {
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(tempSvg, code, {
        format: 'CODE128',
        width: 1.5,
        height: 34,
        displayValue: true,
        fontSize: 10,
        font: 'monospace',
        margin: 2,
      });
      return new XMLSerializer().serializeToString(tempSvg);
    } catch {
      return `<div style="font-family:monospace;font-size:12px;padding:6px;border:1px dashed #999;">${code}</div>`;
    }
  };

  // Print execution
  const handlePrint = () => {
    if (totalLabels === 0) {
      toast.error(t('Selecciona al menos 1 etiqueta para imprimir'));
      return;
    }

    // Build items to print
    const labelsToPrint: Array<{
      name: string;
      size_name: string;
      price: string;
      barcodeSvg: string;
      barcodeText: string;
    }> = [];

    sizes.forEach((s) => {
      const count = quantities[s.id] || 0;
      if (count > 0) {
        const code = s.barcode || product.barcode || generateBarcode();
        const svgStr = getBarcodeSvgString(code);
        const priceFormatted = formatCurrency(effectivePrice + (s.price_modifier || 0));

        for (let i = 0; i < count; i++) {
          labelsToPrint.push({
            name: product.name,
            size_name: s.size_name,
            price: priceFormatted,
            barcodeSvg: svgStr,
            barcodeText: code,
          });
        }
      }
    });

    // Create invisible iframe for clean print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast.error(t('Error al inicializar la impresora'));
      return;
    }

    // Label dimensions according to preset
    const dim = labelSize === 'small'
      ? { width: '40mm', height: '25mm', fontSize: '9px', nameSize: '11px', priceSize: '12px' }
      : labelSize === 'large'
      ? { width: '60mm', height: '40mm', fontSize: '11px', nameSize: '14px', priceSize: '16px' }
      : { width: '50mm', height: '30mm', fontSize: '10px', nameSize: '12px', priceSize: '14px' };

    const labelsHtml = labelsToPrint.map((lbl) => `
      <div class="label-card">
        <div class="header">
          <span class="company-name">${companyName}</span>
          <span class="size-badge">TALLA: ${lbl.size_name}</span>
        </div>
        <div class="product-name">${lbl.name}</div>
        <div class="barcode-container">
          ${lbl.barcodeSvg}
        </div>
        <div class="footer">
          <span class="price">${lbl.price}</span>
        </div>
      </div>
    `).join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${product.name} - Etiquetas</title>
          <style>
            @page {
              size: ${dim.width} ${dim.height};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-card {
              width: ${dim.width};
              height: ${dim.height};
              padding: 1.5mm 2.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .header {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: ${dim.fontSize};
              border-bottom: 0.5px solid #ddd;
              padding-bottom: 1px;
            }
            .company-name {
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-size: 8px;
              color: #333;
            }
            .size-badge {
              font-weight: 800;
              background: #000;
              color: #fff;
              padding: 1px 4px;
              border-radius: 2px;
              font-size: 8.5px;
            }
            .product-name {
              font-size: ${dim.nameSize};
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              margin-top: 1px;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 1px 0;
            }
            .barcode-container svg {
              max-width: 95%;
              height: auto;
            }
            .footer {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              border-top: 0.5px solid #eee;
              padding-top: 1px;
            }
            .price {
              font-size: ${dim.priceSize};
              font-weight: 900;
              letter-spacing: -0.2px;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);

    toast.success(t(`Enviando ${totalLabels} etiquetas a la impresora...`));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{t('Imprimir Etiquetas de Código de Barras')}</h3>
              <p className="text-xs text-amber-100">{product.name} • {sizes.length} {t('tallas')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Size list and quantity selectors (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {t('Seleccionar Unidades / Tallas a Imprimir')}
              </h4>
              <button
                type="button"
                onClick={() => {
                  const allStock: Record<string, number> = {};
                  sizes.forEach((s) => {
                    allStock[s.id] = s.stock > 0 ? s.stock : 1;
                  });
                  setQuantities(allStock);
                }}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
              >
                {t('Restablecer al stock')}
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sizes.map((size, idx) => {
                const count = quantities[size.id] || 0;
                const isSelected = selectedPreviewIndex === idx;
                const hasBarcode = Boolean(size.barcode);

                return (
                  <div
                    key={size.id}
                    onClick={() => setSelectedPreviewIndex(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-10 rounded-lg bg-gray-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                        {size.size_name}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">
                            {formatCurrency(effectivePrice + (size.price_modifier || 0))}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            • Stock: <strong className="text-gray-700">{size.stock}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {hasBarcode ? (
                            <span className="text-[11px] font-mono text-gray-600 truncate max-w-[140px]">
                              {size.barcode}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                              <span>{t('Sin código')}</span>
                              <button
                                type="button"
                                disabled={generatingForSize === size.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateBarcodeForSize(size.id);
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[10px] font-semibold transition-colors"
                              >
                                {generatingForSize === size.id ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                {t('Generar')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity counter */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => ({
                            ...prev,
                            [size.id]: Math.max(0, (prev[size.id] || 0) - 1),
                          }))
                        }
                        className="w-7 h-7 rounded-md bg-white hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-xs"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={count}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setQuantities((prev) => ({
                            ...prev,
                            [size.id]: Math.max(0, val),
                          }));
                        }}
                        className="w-10 text-center font-bold text-xs bg-transparent border-0 focus:ring-0 p-0 text-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => ({
                            ...prev,
                            [size.id]: (prev[size.id] || 0) + 1,
                          }))
                        }
                        className="w-7 h-7 rounded-md bg-white hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Label format selector */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {t('Tamaño de Etiqueta')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLabelSize('small')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                    labelSize === 'small'
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  40 x 25 mm
                  <span className="block text-[10px] text-gray-400 font-normal">Pequeña</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('standard')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                    labelSize === 'standard'
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  50 x 30 mm
                  <span className="block text-[10px] text-gray-400 font-normal">Estándar (Recomendado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('large')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                    labelSize === 'large'
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  60 x 40 mm
                  <span className="block text-[10px] text-gray-400 font-normal">Grande</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Preview Box (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between bg-gray-50 rounded-xl p-4 border border-gray-200/80">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  {t('Vista Previa de la Etiqueta')}
                </h4>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-semibold">
                  1:1 Real
                </span>
              </div>

              {/* Physical Label simulation box */}
              <div className="bg-white rounded-lg p-3 shadow-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-between mx-auto max-w-[220px] aspect-[5/3] transition-all">
                {/* Header */}
                <div className="w-full flex items-center justify-between border-b border-gray-200 pb-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-700 truncate max-w-[120px]">
                    {companyName}
                  </span>
                  <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.2 rounded">
                    TALLA: {currentPreview?.size_name || 'ST'}
                  </span>
                </div>

                {/* Product Name */}
                <div className="w-full font-bold text-xs text-gray-900 text-center truncate my-1">
                  {product.name}
                </div>

                {/* Barcode Render */}
                <div className="w-full flex justify-center items-center my-0.5 overflow-hidden">
                  <svg ref={previewSvgRef} className="max-w-full h-auto" />
                </div>

                {/* Footer / Price */}
                <div className="w-full flex items-center justify-center border-t border-gray-100 pt-1">
                  <span className="text-base font-black text-gray-900 tracking-tight">
                    {formatCurrency(itemPrice)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                {t('Compatible con cualquier impresora térmica de etiquetas (Zebra, Munbyn, Xprinter, etc.) y lectores láser/móvil.')}
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-amber-100/60 rounded-xl p-3 border border-amber-200/80 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-900 font-medium">{t('Total etiquetas a imprimir:')}</span>
                <span className="text-base font-extrabold text-amber-950 px-2 py-0.5 bg-amber-200/80 rounded-md">
                  {totalLabels}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            {t('Cancelar')}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={totalLabels === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            {t(`Imprimir ${totalLabels} Etiquetas`)}
          </button>
        </div>
      </div>
    </div>
  );
}
