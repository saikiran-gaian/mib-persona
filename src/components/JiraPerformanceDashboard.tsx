import React, { useState, useMemo } from 'react';
import { User, TrendingUp, CheckCircle, Clock, Calendar } from 'lucide-react';

interface StoryPointData {
  date: string;
  total: number;
  closed: number;
  inProgress: number;
}

interface ProfileData {
  name: string;
  designation: string;
  avatar: string;
  totalStoryPoints: number;
  closedStoryPoints: number;
  inProgressStoryPoints: number;
}

const JiraPerformanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'reportee'>('assigned');
  const [selectedFilter, setSelectedFilter] = useState<'1D' | '1W' | '1M' | '1Y' | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: StoryPointData } | null>(null);

  // Mock data for demonstration - Assigned means tickets assigned TO this person
  const assignedProfile: ProfileData = {
    name: 'Sarah Chen',
    designation: 'Lead Product Manager',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    totalStoryPoints: 1247,
    closedStoryPoints: 1089,
    inProgressStoryPoints: 158
  };

  // Reportee means tickets this person assigned to others (as a lead/manager)
  const reporteeProfile: ProfileData = {
    name: 'Sarah Chen',
    designation: 'Lead Product Manager',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    totalStoryPoints: 2847,
    closedStoryPoints: 2456,
    inProgressStoryPoints: 391
  };

  // Generate mock chart data
  const generateChartData = (profile: ProfileData): StoryPointData[] => {
    const data: StoryPointData[] = [];
    const startDate = new Date('2024-01-01');
    const currentDate = new Date('2024-07-15'); // Current date in July
    const endDate = currentDate;
    
    let iterDate = new Date(startDate);
    let cumulativeTotal = 0;
    let cumulativeClosed = 0;
    
    while (iterDate <= endDate) {
      // More realistic daily data progression
      const dailyIncrease = Math.floor(Math.random() * 5) + 2; // 2-6 points per day
      const dailyCompleted = Math.floor(Math.random() * 4) + 1; // 1-4 points completed per day
      
      cumulativeTotal += dailyIncrease;
      cumulativeClosed += dailyCompleted;
      
      // Ensure closed doesn't exceed total
      if (cumulativeClosed > cumulativeTotal) {
        cumulativeClosed = cumulativeTotal;
      }
      
      data.push({
        date: iterDate.toISOString().split('T')[0],
        total: Math.min(cumulativeTotal, profile.totalStoryPoints),
        closed: Math.min(cumulativeClosed, profile.closedStoryPoints),
        inProgress: Math.min(cumulativeTotal - cumulativeClosed, profile.inProgressStoryPoints)
      });
      
      iterDate.setDate(iterDate.getDate() + 1); // Daily data points
    }
    
    return data;
  };

  const assignedData = generateChartData(assignedProfile);
  const reporteeData = generateChartData(reporteeProfile);

  const currentProfile = activeTab === 'assigned' ? assignedProfile : reporteeProfile;
  const currentData = activeTab === 'assigned' ? assignedData : reporteeData;

  // Filter data based on selected time period
  const filteredData = useMemo(() => {
    if (!selectedFilter) return currentData;

    const now = new Date('2024-07-15'); // Current date
    let startDate = new Date();

    switch (selectedFilter) {
      case '1D':
        startDate = new Date('2024-07-14'); // Yesterday
        break;
      case '1W':
        startDate = new Date('2024-07-08'); // 7 days ago
        break;
      case '1M':
        startDate = new Date('2024-06-15'); // 1 month ago
        break;
      case '1Y':
        startDate = new Date('2023-07-15'); // 1 year ago
        break;
    }

    return currentData.filter(item => new Date(item.date) >= startDate);
  }, [currentData, selectedFilter]);

  // Get current week data for highlighting
  const getCurrentWeekRange = () => {
    const now = new Date('2024-07-15'); // Current date
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { start: startOfWeek, end: endOfWeek };
  };

  const currentWeek = getCurrentWeekRange();

  // Simple SVG chart component
  const AreaChart: React.FC<{ data: StoryPointData[] }> = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="w-full h-80 bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex items-center justify-center">
          <p className="text-gray-500">No data available for selected time period</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.total));
    const width = 800;
    const height = 300;
    const padding = 40;

    const getX = (index: number) => (index / (data.length - 1)) * (width - 2 * padding) + padding;
    const getY = (value: number) => height - padding - ((value / maxValue) * (height - 2 * padding));

    // Find current week data points for highlighting
    const currentWeekIndices = data
      .map((d, i) => ({ date: new Date(d.date), index: i }))
      .filter(({ date }) => {
        const weekStart = new Date(currentWeek.start);
        const weekEnd = new Date(currentWeek.end);
        return date >= weekStart && date <= weekEnd;
      })
      .map(({ index }) => index);

    const totalPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`).join(' ');
    const closedPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.closed)}`).join(' ');

    // Create area path for total points
    const areaPath = totalPath + ` L ${getX(data.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`;

    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      
      // Convert screen coordinates to data coordinates
      const dataIndex = Math.round(((x - padding) / (width - 2 * padding)) * (data.length - 1));
      
      // Only show tooltip if mouse is within chart bounds and over valid data
      if (dataIndex >= 0 && dataIndex < data.length && x >= padding && x <= width - padding) {
        // Calculate tooltip position with edge detection
        const tooltipWidth = 200; // Approximate tooltip width
        const tooltipHeight = 100; // Approximate tooltip height
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        let tooltipX = event.clientX;
        let tooltipY = event.clientY - 10;
        
        // Adjust horizontal position if tooltip would go off-screen
        if (tooltipX + tooltipWidth > screenWidth) {
          tooltipX = event.clientX - tooltipWidth;
        }
        
        // Adjust vertical position if tooltip would go off-screen
        if (tooltipY - tooltipHeight < 0) {
          tooltipY = event.clientY + 20;
        }
        
        setHoveredPoint({
          x: tooltipX,
          y: tooltipY,
          data: data[dataIndex]
        });
      } else {
        setHoveredPoint(null);
      }
    };

    const handleMouseLeave = () => {
      setHoveredPoint(null);
    };

    return (
      <div className="w-full h-80 bg-white rounded-lg p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${width} ${height}`} 
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
            </pattern>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6"/>
              <stop offset="100%" stopColor="#6366F1"/>
            </linearGradient>
            <linearGradient id="closedLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981"/>
              <stop offset="100%" stopColor="#22C55E"/>
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)"/>
          
          {/* Current week highlight with blinking animation */}
          {!selectedFilter && currentWeekIndices.length > 0 && (
            <g>
              {/* Yellow background for current week */}
              <rect
                x={getX(currentWeekIndices[0]) - 20}
                y={padding}
                width={currentWeekIndices.length > 1 ? getX(currentWeekIndices[currentWeekIndices.length - 1]) - getX(currentWeekIndices[0]) + 40 : 40}
                height={height - 2 * padding}
                fill="#FBBF24"
                opacity="0.4"
                rx="4"
              >
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"/>
              </rect>
              {/* Current week label */}
              <text
                x={getX(currentWeekIndices[0]) + (currentWeekIndices.length > 1 ? (getX(currentWeekIndices[currentWeekIndices.length - 1]) - getX(currentWeekIndices[0])) / 2 : 0)}
                y={padding - 10}
                textAnchor="middle"
                className="text-xs fill-amber-700 font-bold"
              >
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
                CURRENT WEEK
              </text>
            </g>
          )}
          
          {/* Area chart for total points */}
          <path d={areaPath} fill="url(#areaGradient)" />
          
          {/* Lines */}
          <path d={totalPath} fill="none" stroke="url(#lineGradient)" strokeWidth="4"/>
          <path d={closedPath} fill="none" stroke="url(#closedLineGradient)" strokeWidth="4"/>
          
          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              {/* Total points */}
              <circle 
                cx={getX(i)} 
                cy={getY(d.total)} 
                r={currentWeekIndices.includes(i) && !selectedFilter ? "6" : "4"} 
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
              >
                {currentWeekIndices.includes(i) && !selectedFilter && (
                  <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite"/>
                )}
              </circle>
              {/* Closed points */}
              <circle 
                cx={getX(i)} 
                cy={getY(d.closed)} 
                r={currentWeekIndices.includes(i) && !selectedFilter ? "6" : "4"} 
                fill="#22C55E"
                stroke="#FFFFFF"
                strokeWidth="2"
              >
                {currentWeekIndices.includes(i) && !selectedFilter && (
                  <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite"/>
                )}
              </circle>
            </g>
          ))}
          
          {/* Y-axis labels */}
          {[0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue].map((value, i) => (
            <text
              key={i}
              x={padding - 10}
              y={getY(value) + 4}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {Math.round(value)}
            </text>
          ))}
          
          {/* X-axis labels */}
          {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d, i) => (
            <text
              key={`x-label-${i}`}
              x={getX(i * Math.ceil(data.length / 8))}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint && (
          <div 
            className="fixed z-[9999] bg-gray-800 text-white px-4 py-3 rounded-xl shadow-xl text-sm pointer-events-none border border-gray-600 min-w-[200px]"
            style={{
              left: hoveredPoint.x,
              top: hoveredPoint.y,
            }}
          >
            <div className="font-bold mb-2 text-gray-100">
              {new Date(hoveredPoint.data.date).toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                <span className="text-gray-200">Total: <span className="font-semibold text-white">{hoveredPoint.data.total}</span> points</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                <span className="text-gray-200">Closed: <span className="font-semibold text-white">{hoveredPoint.data.closed}</span> points</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"></div>
                <span className="text-gray-200">In Progress: <span className="font-semibold text-white">{hoveredPoint.data.inProgress}</span> points</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm"></div>
            <span className="text-sm text-gray-600 font-medium">Total Story Points</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"></div>
            <span className="text-sm text-gray-600 font-medium">Closed Story Points</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent mb-2">
                Performance Analytics Suite
              </h1>
              <p className="text-gray-600 text-lg">Enterprise-grade story point tracking and team performance insights</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white p-1.5 rounded-xl shadow-md border border-gray-200 w-fit">
            {[
              { key: 'assigned', label: 'My Performance' },
              { key: 'reportee', label: 'Team Leadership' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'assigned' | 'reportee')}
                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img
                src={currentProfile.avatar}
                alt={currentProfile.name}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-blue-100 shadow-md"
              />
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-400 w-7 h-7 rounded-full border-4 border-white shadow-md">
                <div className="w-full h-full rounded-full animate-pulse bg-green-300"></div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentProfile.name}</h2>
              <p className="text-gray-600 mb-4 text-lg">{currentProfile.designation}</p>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <User className="w-4 h-4" />
                <span className="font-medium">{activeTab === 'assigned' ? 'Individual Contributor Metrics' : 'Leadership & Delegation Metrics'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide">
                  {activeTab === 'assigned' ? 'Total Assigned Points' : 'Total Delegated Points'}
                </p>
                <p className="text-4xl font-bold mt-3">{currentProfile.totalStoryPoints.toLocaleString()}</p>
                <p className="text-blue-200 text-sm mt-1">+12% from last month</p>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-10 h-10" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 rounded-2xl p-8 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-semibold uppercase tracking-wide">
                  {activeTab === 'assigned' ? 'Completed Points' : 'Team Completed Points'}
                </p>
                <p className="text-4xl font-bold mt-3">{currentProfile.closedStoryPoints.toLocaleString()}</p>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm">
                <CheckCircle className="w-10 h-10" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-green-100 text-sm">
                <span className="font-medium">{Math.round((currentProfile.closedStoryPoints / currentProfile.totalStoryPoints) * 100)}% completion rate</span>
                <span className="text-green-200">↗ +5%</span>
              </div>
              <div className="w-full bg-green-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-green-300 to-emerald-300 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.round((currentProfile.closedStoryPoints / currentProfile.totalStoryPoints) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-400 via-amber-500 to-orange-500 rounded-2xl p-8 text-white shadow-lg transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-semibold uppercase tracking-wide">
                  {activeTab === 'assigned' ? 'In Progress Points' : 'Team In Progress Points'}
                </p>
                <p className="text-4xl font-bold mt-3">{currentProfile.inProgressStoryPoints.toLocaleString()}</p>
                <p className="text-orange-200 text-sm mt-1">Active sprint work</p>
              </div>
              <div className="bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm">
                <Clock className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10">
          {/* Chart Header with Filters */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Performance Trends & Analytics</h3>
              <p className="text-gray-600 text-lg">
                {activeTab === 'assigned' ? 'Track your personal progress' : 'Track your team\'s progress'}
              </p>
            </div>
            
            <div className="flex space-x-3">
              {['1D', '1W', '1M', '1Y'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(selectedFilter === filter ? null : filter as any)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    selectedFilter === filter
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-md'
                  }`}
                >
                  {filter}
                </button>
              ))}
              {selectedFilter && (
                <button
                  onClick={() => setSelectedFilter(null)}
                  className="px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md transition-all duration-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Current Week Indicator */}
          {!selectedFilter && (
            <div className="flex items-center space-x-3 mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 shadow-sm">
              <Calendar className="w-6 h-6 text-orange-500" />
              <span className="text-sm text-orange-700 font-medium">
                <strong>Current week</strong> is highlighted and blinking in the chart ({currentWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {currentWeek.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
              </span>
            </div>
          )}

          {/* Chart */}
          <AreaChart data={filteredData} />
        </div>
      </div>
    </div>
  );
};

export default JiraPerformanceDashboard;