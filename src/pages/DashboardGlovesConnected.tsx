const DashboardGlovesConnected = () => {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Logo in top left corner */}
      <div className="absolute top-0 left-0 z-[100] bg-white p-4 rounded-br-lg shadow-xl border-b border-r border-gray-200">
        <img 
          src="/Logo.png" 
          alt="HandsOn Logo" 
          className="h-12 w-auto max-w-[140px] object-contain block"
          onError={(e) => {
            console.error('Logo image failed to load');
          }}
        />
      </div>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard - Gloves Connected</h1>
        <p className="text-gray-600">Page placeholder - Design from Figma</p>
      </div>
    </div>
  );
};

export default DashboardGlovesConnected;

