import DashboardStats from '@/components/DashboardStats';

export default function Home() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Portföy Özeti</h1>
        <p className="text-gray-500 mt-1 text-sm">Altın ve diğer varlıklarınızın genel durumu.</p>
      </div>

      <DashboardStats />

      <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
        Yeni varlık eklemek için üst menüden <strong>Ekle</strong> sayfasına, geçmiş işlemlerinizi görmek için <strong>Geçmiş</strong> sayfasına gidiniz.
      </div>
    </div>
  );
}
