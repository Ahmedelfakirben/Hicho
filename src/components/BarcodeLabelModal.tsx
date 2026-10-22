import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Plus, Minus, Tag } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface IndividualUnitItem {
  id: string;
  size_id?: string;
  size_name: string;
  barcode: string;
  unit_number?: number;
}

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
  units?: IndividualUnitItem[];
  onUpdateUnitBarcode?: (unitId: string, barcode: string) => Promise<void>;
  initialSelectedUnitId?: string;
  initialSelectedSizeId?: string;
}

export type LabelSizePreset = '50x25' | '50x30' | '40x25' | '60x40' | '30x20' | 'custom';

export function getLabelDimensions(
  sizeKey: LabelSizePreset,
  customW: number,
  customH: number
) {
  switch (sizeKey) {
    case '50x25':
      return {
        width: '50mm',
        height: '25mm',
        numericWidth: 50,
        numericHeight: 25,
        padding: '1mm 2mm',
        companySize: '7.5px',
        sizeBadgeSize: '8px',
        nameSize: '10px',
        priceSize: '12px',
        barcodeHeight: 22,
        barcodeWidth: 1.25,
        barcodeFontSize: 9,
        barcodeMargin: 1,
      };
    case '50x30':
      return {
        width: '50mm',
        height: '30mm',
        numericWidth: 50,
        numericHeight: 30,
        padding: '1.5mm 2.5mm',
        companySize: '8px',
        sizeBadgeSize: '8.5px',
        nameSize: '12px',
        priceSize: '14px',
        barcodeHeight: 30,
        barcodeWidth: 1.35,
        barcodeFontSize: 10,
        barcodeMargin: 2,
      };
    case '40x25':
      return {
        width: '40mm',
        height: '25mm',
        numericWidth: 40,
        numericHeight: 25,
        padding: '1mm 1.5mm',
        companySize: '7px',
        sizeBadgeSize: '7.5px',
        nameSize: '9.5px',
        priceSize: '11.5px',
        barcodeHeight: 20,
        barcodeWidth: 1.15,
        barcodeFontSize: 8.5,
        barcodeMargin: 1,
      };
    case '60x40':
      return {
        width: '60mm',
        height: '40mm',
        numericWidth: 60,
        numericHeight: 40,
        padding: '2mm 3mm',
        companySize: '9px',
        sizeBadgeSize: '10px',
        nameSize: '14px',
        priceSize: '16px',
        barcodeHeight: 42,
        barcodeWidth: 1.6,
        barcodeFontSize: 11,
        barcodeMargin: 2,
      };
    case '30x20':
      return {
        width: '30mm',
        height: '20mm',
        numericWidth: 30,
        numericHeight: 20,
        padding: '0.8mm 1mm',
        companySize: '6.5px',
        sizeBadgeSize: '7px',
        nameSize: '8.5px',
        priceSize: '10px',
        barcodeHeight: 16,
        barcodeWidth: 1.0,
        barcodeFontSize: 7.5,
        barcodeMargin: 0,
      };
    case 'custom': {
      const w = Math.max(20, Math.min(120, customW || 50));
      const h = Math.max(15, Math.min(120, customH || 25));
      const ratio = h / 25;
      return {
        width: `${w}mm`,
        height: `${h}mm`,
        numericWidth: w,
        numericHeight: h,
        padding: `${Math.max(0.8, Math.min(2.5, h * 0.05))}mm ${Math.max(1, Math.min(3, w * 0.05))}mm`,
        companySize: `${Math.max(6, Math.round(7.5 * ratio * 10) / 10)}px`,
        sizeBadgeSize: `${Math.max(6.5, Math.round(8 * ratio * 10) / 10)}px`,
        nameSize: `${Math.max(8, Math.round(10 * ratio * 10) / 10)}px`,
        priceSize: `${Math.max(9, Math.round(12 * ratio * 10) / 10)}px`,
        barcodeHeight: Math.max(14, Math.round(22 * ratio)),
        barcodeWidth: Math.max(1.0, Math.min(1.8, Math.round((w / 50) * 1.25 * 10) / 10)),
        barcodeFontSize: Math.max(7, Math.round(9 * ratio)),
        barcodeMargin: h < 22 ? 0 : 1,
      };
    }
  }
}

export function BarcodeLabelModal({
  isOpen,
  onClose,
  product,
  sizes,
  units = [],
  initialSelectedUnitId,
  initialSelectedSizeId,
}: BarcodeLabelModalProps) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  // Print quantities: if units provided, keyed by unit.id; otherwise keyed by size.id
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedPreviewUnitId, setSelectedPreviewUnitId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Linventory');

  // Label size preset: Default to 50x25 mm (requested by user/client), persists in localStorage
  const [labelSize, setLabelSize] = useState<LabelSizePreset>(() => {
    try {
      const saved = localStorage.getItem('linventory_barcode_label_size') as LabelSizePreset;
      if (saved && ['50x25', '50x30', '40x25', '60x40', '30x20', 'custom'].includes(saved)) {
        return saved;
      }
    } catch {}
    return '50x25';
  });

  const [customWidth, setCustomWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('linventory_barcode_label_w');
      return saved ? parseInt(saved, 10) : 50;
    } catch {
      return 50;
    }
  });

  const [customHeight, setCustomHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('linventory_barcode_label_h');
      return saved ? parseInt(saved, 10) : 25;
    } catch {
      return 25;
    }
  });

  // Content toggles
  const [showCompany, setShowCompany] = useState<boolean>(true);
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showSize, setShowSize] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);

  const previewSvgRef = useRef<SVGSVGElement>(null);

  const hasIndividualUnits = units && units.length > 0;

  const currentDimensions = getLabelDimensions(labelSize, customWidth, customHeight);

  const handleSelectSize = (newSize: LabelSizePreset) => {
    setLabelSize(newSize);
    try {
      localStorage.setItem('linventory_barcode_label_size', newSize);
    } catch {}
  };

  const handleUpdateCustomW = (val: number) => {
    setCustomWidth(val);
    try {
      localStorage.setItem('linventory_barcode_label_w', String(val));
    } catch {}
  };

  const handleUpdateCustomH = (val: number) => {
    setCustomHeight(val);
    try {
      localStorage.setItem('linventory_barcode_label_h', String(val));
    } catch {}
  };

  // Initialize quantities based on units or sizes
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};

      if (hasIndividualUnits) {
        units.forEach((u) => {
          if (initialSelectedUnitId) {
            initial[u.id] = u.id === initialSelectedUnitId ? 1 : 0;
          } else if (initialSelectedSizeId) {
            initial[u.id] = u.size_id === initialSelectedSizeId ? 1 : 0;
          } else {
            // By default, print 1 label for each physical unit in stock
            initial[u.id] = 1;
          }
        });
        setQuantities(initial);

        if (initialSelectedUnitId) {
          setSelectedPreviewUnitId(initialSelectedUnitId);
        } else {
          setSelectedPreviewUnitId(units[0]?.id || null);
        }
      } else {
        sizes.forEach((s) => {
          if (initialSelectedSizeId) {
            initial[s.id] = s.id === initialSelectedSizeId ? Math.max(1, s.stock || 1) : 0;
          } else {
            initial[s.id] = s.stock > 0 ? s.stock : 1;
          }
        });
        setQuantities(initial);
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
  }, [isOpen, sizes, units, initialSelectedUnitId, initialSelectedSizeId, hasIndividualUnits]);

  // Total labels to print
  const totalLabels = Object.values(quantities).reduce((a, b) => a + (b || 0), 0);

  // Helper: Effective price
  const effectivePrice = (product.promo_price && product.promo_price > 0)
    ? product.promo_price
    : (product.base_price || 0);

  // Determine current item to preview
  let currentPreviewBarcode = 'SIN-CODIGO';
  let currentPreviewSizeName = 'ST';

  if (hasIndividualUnits) {
    const selectedUnit = units.find((u) => u.id === selectedPreviewUnitId) || units[0];
    if (selectedUnit) {
      currentPreviewBarcode = selectedUnit.barcode || 'SIN-CODIGO';
      currentPreviewSizeName = selectedUnit.size_name || 'ST';
    }
  } else {
    const selectedSize = sizes[0];
    if (selectedSize) {
      currentPreviewBarcode = selectedSize.barcode || product.barcode || 'SIN-CODIGO';
      currentPreviewSizeName = selectedSize.size_name || 'ST';
    }
  }

  // Render preview barcode whenever barcode or dimensions change
  useEffect(() => {
    if (previewSvgRef.current) {
      try {
        JsBarcode(previewSvgRef.current, currentPreviewBarcode, {
          format: 'CODE128',
          width: currentDimensions.barcodeWidth,
          height: currentDimensions.barcodeHeight,
          displayValue: true,
          fontSize: currentDimensions.barcodeFontSize,
          font: 'monospace',
          margin: currentDimensions.barcodeMargin,
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Error rendering barcode in preview:', err);
      }
    }
  }, [
    currentPreviewBarcode,
    currentDimensions.barcodeWidth,
    currentDimensions.barcodeHeight,
    currentDimensions.barcodeFontSize,
    currentDimensions.barcodeMargin,
  ]);

  // Generate unique barcode utility
  const generateBarcode = () => {
    const timePart = Date.now().toString().slice(-6);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `20${timePart}${randomPart}`;
  };

  // Generate SVG string for printing adapted to label dimensions
  const getBarcodeSvgString = (
    code: string,
    barHeight: number,
    barWidth: number,
    barFontSize: number,
    barMargin: number
  ): string => {
    try {
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(tempSvg, code, {
        format: 'CODE128',
        width: barWidth,
        height: barHeight,
        displayValue: true,
        fontSize: barFontSize,
        font: 'monospace',
        margin: barMargin,
      });
      return new XMLSerializer().serializeToString(tempSvg);
    } catch {
      return `<div style="font-family:monospace;font-size:10px;padding:2px;border:1px dashed #999;">${code}</div>`;
    }
  };

  // Print execution
  const handlePrint = () => {
    if (totalLabels === 0) {
      toast.error(t('Selecciona al menos 1 etiqueta para imprimir'));
      return;
    }

    const priceFormatted = formatCurrency(effectivePrice);
    const dim = currentDimensions;

    const labelsToPrint: Array<{
      name: string;
      size_name: string;
      price: string;
      barcodeSvg: string;
      barcodeText: string;
    }> = [];

    if (hasIndividualUnits) {
      // Print unique barcode for each physical unit
      units.forEach((u) => {
        const count = quantities[u.id] || 0;
        if (count > 0) {
          const code = u.barcode || generateBarcode();
          const svgStr = getBarcodeSvgString(
            code,
            dim.barcodeHeight,
            dim.barcodeWidth,
            dim.barcodeFontSize,
            dim.barcodeMargin
          );

          for (let i = 0; i < count; i++) {
            labelsToPrint.push({
              name: product.name,
              size_name: u.size_name,
              price: priceFormatted,
              barcodeSvg: svgStr,
              barcodeText: code,
            });
          }
        }
      });
    } else {
      sizes.forEach((s) => {
        const count = quantities[s.id] || 0;
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const code = (i === 0 && s.barcode) ? s.barcode : generateBarcode();
            const svgStr = getBarcodeSvgString(
              code,
              dim.barcodeHeight,
              dim.barcodeWidth,
              dim.barcodeFontSize,
              dim.barcodeMargin
            );

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
    }

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

    const labelsHtml = labelsToPrint.map((lbl) => `
      <div class="label-card">
        ${(showCompany || (showSize && lbl.size_name)) ? `
          <div class="header">
            ${showCompany ? `<span class="company-name">${companyName}</span>` : '<span></span>'}
            ${showSize && lbl.size_name ? `<span class="size-badge">TALLA: ${lbl.size_name}</span>` : ''}
          </div>
        ` : ''}
        ${showProductName ? `<div class="product-name">${lbl.name}</div>` : ''}
        <div class="barcode-container">
          ${lbl.barcodeSvg}
        </div>
        ${showPrice ? `
          <div class="footer">
            <span class="price">${lbl.price}</span>
          </div>
        ` : ''}
      </div>
    `).join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${product.name} - Etiquetas (${dim.width}x${dim.height})</title>
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
            html, body {
              width: ${dim.width};
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-card {
              width: ${dim.width};
              height: ${dim.height};
              max-height: ${dim.height};
              box-sizing: border-box;
              padding: ${dim.padding};
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: hidden;
            }
            .label-card:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .header {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 0.5px solid #ddd;
              padding-bottom: 1px;
              line-height: 1.1;
            }
            .company-name {
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              font-size: ${dim.companySize};
              color: #333;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 65%;
            }
            .size-badge {
              font-weight: 800;
              background: #000;
              color: #fff;
              padding: 1px 3px;
              border-radius: 2px;
              font-size: ${dim.sizeBadgeSize};
              white-space: nowrap;
            }
            .product-name {
              font-size: ${dim.nameSize};
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              line-height: 1.15;
              margin-top: 0.5px;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0.5px 0;
              flex: 1;
              overflow: hidden;
            }
            .barcode-container svg {
              max-width: 98%;
              max-height: 100%;
              height: auto;
              display: block;
            }
            .footer {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              border-top: 0.5px solid #eee;
              padding-top: 0.5px;
              line-height: 1.1;
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

    toast.success(t(`Imprimiendo ${totalLabels} etiquetas (${dim.width} × ${dim.height})...`));
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
              <h3 className="font-bold text-lg leading-tight">{t('Imprimir Etiquetas de Códigos de Barra')}</h3>
              <p className="text-xs text-amber-100">
                {product.name} • {hasIndividualUnits ? `${units.length} unidades individuales` : `${sizes.length} tallas`}
              </p>
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
          {/* Left: Units / Sizes list with quantity selectors (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {hasIndividualUnits ? t('Prendas / Unidades Físicas (1 código por unidad)') : t('Seleccionar Tallas a Imprimir')}
              </h4>
              <button
                type="button"
                onClick={() => {
                  const allOn: Record<string, number> = {};
                  if (hasIndividualUnits) {
                    units.forEach((u) => { allOn[u.id] = 1; });
                  } else {
                    sizes.forEach((s) => { allOn[s.id] = s.stock > 0 ? s.stock : 1; });
                  }
                  setQuantities(allOn);
                }}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
              >
                {t('Seleccionar todas')}
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {hasIndividualUnits ? (
                units.map((unit, idx) => {
                  const count = quantities[unit.id] || 0;
                  const isSelected = selectedPreviewUnitId === unit.id;

                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedPreviewUnitId(unit.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-10 rounded-lg bg-gray-900 text-white font-bold text-xs flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                          <span>{unit.size_name}</span>
                          <span className="text-[9px] text-amber-400 font-normal">#{unit.unit_number || (idx + 1)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">
                              {unit.size_name} • Unidad #{unit.unit_number || (idx + 1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded truncate max-w-[170px]">
                              {unit.barcode}
                            </span>
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
                              [unit.id]: Math.max(0, (prev[unit.id] || 0) - 1),
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
                              [unit.id]: Math.max(0, val),
                            }));
                          }}
                          className="w-8 text-center font-bold text-xs bg-transparent border-0 focus:ring-0 p-0 text-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [unit.id]: (prev[unit.id] || 0) + 1,
                            }))
                          }
                          className="w-7 h-7 rounded-md bg-white hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                sizes.map((size) => {
                  const count = quantities[size.id] || 0;
                  return (
                    <div
                      key={size.id}
                      className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-lg bg-gray-900 text-white font-bold text-xs flex items-center justify-center">
                          {size.size_name}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-800">{size.size_name}</div>
                          <div className="text-[11px] text-gray-500 font-mono">{size.barcode || 'Sin código'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        <input
                          type="number"
                          min="0"
                          value={count}
                          onChange={(e) => setQuantities({ ...quantities, [size.id]: parseInt(e.target.value) || 0 })}
                          className="w-10 text-center font-bold text-xs bg-transparent border-0"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Label format selector */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {t('Tamaño de Etiqueta')}
                </label>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                  {currentDimensions.width} × {currentDimensions.height}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 50 x 25 mm - Recommended by customer */}
                <button
                  type="button"
                  onClick={() => handleSelectSize('50x25')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    labelSize === '50x25'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block font-bold">50 x 25 mm</span>
                  <span className="block text-[10px] text-amber-700 font-medium">5 × 2.5 cm (Ideal)</span>
                </button>

                {/* 50 x 30 mm */}
                <button
                  type="button"
                  onClick={() => handleSelectSize('50x30')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    labelSize === '50x30'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block font-bold">50 x 30 mm</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Estándar Ropa</span>
                </button>

                {/* 40 x 25 mm */}
                <button
                  type="button"
                  onClick={() => handleSelectSize('40x25')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    labelSize === '40x25'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block font-bold">40 x 25 mm</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Pequeña</span>
                </button>

                {/* 60 x 40 mm */}
                <button
                  type="button"
                  onClick={() => handleSelectSize('60x40')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    labelSize === '60x40'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block font-bold">60 x 40 mm</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Grande</span>
                </button>

                {/* 30 x 20 mm */}
                <button
                  type="button"
                  onClick={() => handleSelectSize('30x20')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    labelSize === '30x20'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block font-bold">30 x 20 mm</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Mini</span>
                </button>

                {/* Custom dimensions */}
                <button
                  type="button"
                  onClick={() => handleSelectSize('custom')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    labelSize === 'custom'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-900 font-bold ring-2 ring-amber-400/40 shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block font-bold">{t('Personalizado')}</span>
                  <span className="block text-[10px] text-gray-400 font-normal">{customWidth} × {customHeight} mm</span>
                </button>
              </div>

              {/* Custom dimensions inputs if 'custom' selected */}
              {labelSize === 'custom' && (
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex-1 flex items-center gap-1.5">
                    <label className="text-xs text-gray-600 font-semibold">{t('Ancho')}:</label>
                    <input
                      type="number"
                      min="20"
                      max="120"
                      value={customWidth}
                      onChange={(e) => handleUpdateCustomW(parseInt(e.target.value) || 50)}
                      className="w-16 px-2 py-1 text-xs font-bold border border-gray-300 rounded-md bg-white text-center focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-gray-400">mm</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5">
                    <label className="text-xs text-gray-600 font-semibold">{t('Alto')}:</label>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      value={customHeight}
                      onChange={(e) => handleUpdateCustomH(parseInt(e.target.value) || 25)}
                      className="w-16 px-2 py-1 text-xs font-bold border border-gray-300 rounded-md bg-white text-center focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs text-gray-400">mm</span>
                  </div>
                </div>
              )}

              {/* Optional elements toggle checkboxes */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{t('Incluir')}:</span>
                <label className="flex items-center gap-1 cursor-pointer hover:text-gray-900 select-none">
                  <input
                    type="checkbox"
                    checked={showCompany}
                    onChange={(e) => setShowCompany(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>{t('Empresa')}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer hover:text-gray-900 select-none">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>{t('Nombre')}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer hover:text-gray-900 select-none">
                  <input
                    type="checkbox"
                    checked={showSize}
                    onChange={(e) => setShowSize(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>{t('Talla')}</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer hover:text-gray-900 select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span>{t('Precio')}</span>
                </label>
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
                  {currentDimensions.width} × {currentDimensions.height}
                </span>
              </div>

              {/* Physical Label simulation box with proportional aspect ratio */}
              <div
                className="bg-white rounded-lg p-2.5 shadow-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-between mx-auto transition-all"
                style={{
                  width: '100%',
                  maxWidth: `${Math.min(240, Math.max(160, currentDimensions.numericWidth * 4.4))}px`,
                  aspectRatio: `${currentDimensions.numericWidth} / ${currentDimensions.numericHeight}`,
                  minHeight: '110px',
                }}
              >
                {/* Header */}
                {(showCompany || (showSize && currentPreviewSizeName)) && (
                  <div className="w-full flex items-center justify-between border-b border-gray-200 pb-0.5">
                    {showCompany ? (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-700 truncate max-w-[120px]">
                        {companyName}
                      </span>
                    ) : <span />}
                    {showSize && currentPreviewSizeName && (
                      <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.2 rounded">
                        TALLA: {currentPreviewSizeName}
                      </span>
                    )}
                  </div>
                )}

                {/* Product Name */}
                {showProductName && (
                  <div className="w-full font-bold text-xs text-gray-900 text-center truncate my-0.5">
                    {product.name}
                  </div>
                )}

                {/* Barcode Render */}
                <div className="w-full flex justify-center items-center my-0.5 overflow-hidden flex-1">
                  <svg ref={previewSvgRef} className="max-w-full h-auto" />
                </div>

                {/* Footer / Price */}
                {showPrice && (
                  <div className="w-full flex items-center justify-center border-t border-gray-100 pt-0.5">
                    <span className="text-sm font-black text-gray-900 tracking-tight">
                      {formatCurrency(effectivePrice)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-400 text-center mt-2.5">
                {t('Cada etiqueta saldrá con su código de barra único para identificar individualmente cada prenda física.')}
              </p>

              {/* Thermal Printer tip */}
              <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 mt-3 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <span>💡</span> {t('Ajuste para Impresora Térmica:')}
                </div>
                <div className="text-[10px] text-amber-900/90 leading-tight">
                  {t('En la ventana de impresión del navegador:')}
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    <li>{t('Márgenes:')} <strong>{t('Ninguno (None)')}</strong></li>
                    <li>{t('Desmarcar:')} <strong>{t('Encabezados y pies de página')}</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-amber-100/60 rounded-xl p-3 border border-amber-200/80 mt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-900 font-medium">{t('Total etiquetas a imprimir:')}</span>
                <span className="text-base font-extrabold text-amber-950 px-2.5 py-0.5 bg-amber-200/80 rounded-md">
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
