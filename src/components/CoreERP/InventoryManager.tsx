
import React, { useState } from 'react';
import { Product, AppSettings } from '../../types';
import { calculateProfitability } from '../../services/inventory';
import { callRoxtorAI } from '../../utils/ai';
import { 
  Package, 
  Plus, 
  Search, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  BarChart2,
  Sparkles,
  Loader2
} from 'lucide-react';

interface Props {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: AppSettings;
}

const InventoryManager: React.FC<Props> = ({ products, setProducts, settings }) => {
  const [search, setSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const inventoryData = products.map(p => ({
        name: p.name,
        stock: p.stock,
        cost: p.costUsd,
        price: p.priceRetail,
        category: p.category
      }));

      const result = await callRoxtorAI(`Analiza este inventario y sugiere optimizaciones de stock y precios: ${JSON.stringify(inventoryData)}`, undefined, {
        module: 'inventory'
      });

      setAiAnalysis(result);
    } catch (error) {
      console.error("AI Inventory Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-[#000814] italic uppercase tracking-tighter">Inventario Estructurado</h2>
        <div className="flex gap-4">
          <button 
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-6 py-3 bg-[#004ea1] text-white rounded-2xl font-black uppercase italic text-xs hover:bg-[#000814] transition-all shadow-xl disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {isAnalyzing ? 'Analizando...' : 'Optimizar con IA'}
          </button>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-[#004ea1]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-slate-900 text-white rounded-[3rem] p-8 animate-in slide-in-from-top-4 duration-300 border-4 border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Inteligencia de Almacén</h3>
              <p className="text-[10px] font-black text-blue-400 uppercase italic">Recomendaciones Estratégicas</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <p className="text-sm font-bold text-slate-300 leading-relaxed italic">
                {aiAnalysis.analysis || aiAnalysis.suggested_reply}
              </p>
              {aiAnalysis.extracted_data?.items && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2">Productos Críticos Detectados</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.extracted_data.items.slice(0, 5).map((item: any, i: number) => (
                      <span key={i} className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold">
                        {item.name} - Stock Sugerido: {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-blue-600 p-6 rounded-[2rem] flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-200 uppercase italic mb-2">Acción Recomendada</p>
                <p className="text-lg font-black italic leading-tight uppercase tracking-tighter">
                  {aiAnalysis.action || 'REVISIÓN DE STOCK'}
                </p>
              </div>
              <button className="mt-6 w-full py-3 bg-white text-blue-600 rounded-xl font-black uppercase italic text-[10px] hover:bg-blue-50 transition-all">
                Aplicar Cambios Sugeridos
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Productos" 
          value={products.length.toString()} 
          icon={<Package className="text-blue-500" />} 
        />
        <StatCard 
          label="Stock Bajo" 
          value={products.filter(p => p.stock < 5).length.toString()} 
          icon={<AlertTriangle className="text-rose-500" />} 
          color="text-rose-500"
        />
        <StatCard 
          label="Valor Inventario" 
          value={`$${products.reduce((acc, p) => acc + (p.stock * (p.costUsd || 0)), 0).toLocaleString()}`} 
          icon={<DollarSign className="text-emerald-500" />} 
        />
        <StatCard 
          label="Margen Promedio" 
          value={`${(products.reduce((acc, p) => acc + calculateProfitability(p).marginRetail, 0) / (products.length || 1)).toFixed(1)}%`} 
          icon={<TrendingUp className="text-purple-500" />} 
        />
      </div>

      <div className="bg-white border-4 border-slate-50 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Costo (USD)</th>
              <th className="px-6 py-4">P. Venta (USD)</th>
              <th className="px-6 py-4">Margen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map(product => {
              const { marginRetail } = calculateProfitability(product);
              return (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-[#000814] italic">{product.name}</td>
                  <td className="px-6 py-4 text-slate-500 font-bold text-xs">{product.category || 'General'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-black tabular-nums ${product.stock < 5 ? 'text-rose-500' : 'text-slate-700'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-bold tabular-nums">${product.costUsd || 0}</td>
                  <td className="px-6 py-4 font-black text-[#004ea1] tabular-nums">${product.priceRetail}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${marginRetail > 30 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {marginRetail.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color = 'text-slate-700' }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner">
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{label}</p>
      <p className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</p>
    </div>
  </div>
);

export default InventoryManager;
