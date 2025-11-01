import React, { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, Rocket, Brain, ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw, Filter, TrendingUp, Calendar, Award, Beaker, Download, BarChart3, PieChart } from 'lucide-react';

const NASAPublicationsDashboard = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRelevance, setSelectedRelevance] = useState('all');
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [expandedCard, setExpandedCard] = useState(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [yearFilter, setYearFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

// Replace with your actual Supabase details
  const SUPABASE_URL = 'https://mciamxduiualbkslqfjb.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jaWFteGR1aXVhbGJrc2xxZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTg5MDcsImV4cCI6MjA3NzM3NDkwN30.4Q3LWEMh5oS6EA4nX5QSIWQiOnnjtPrAWgQwBx-L7rU';
  const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook-test/process';

  const parseArray = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return field.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/nasa_publications?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      const data = await response.json();
      setPublications(data);
    } catch (error) {
      console.error('Error fetching publications:', error);
    }
    setLoading(false);
  };

  const triggerProcessing = async () => {
    setProcessing(true);
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setTimeout(() => {
        fetchPublications();
        setProcessing(false);
      }, 5000);
    } catch (error) {
      console.error('Error triggering processing:', error);
      setProcessing(false);
    }
  };

  const getRelevanceColor = (relevance) => {
    switch(relevance) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getComplexityColor = (complexity) => {
    if (complexity >= 7) return 'text-red-500';
    if (complexity >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const filteredPublications = useMemo(() => {
    return publications
      .filter(pub => {
        const matchesSearch = pub.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             pub.abstract?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRelevance = selectedRelevance === 'all' || pub.mission_relevance === selectedRelevance;
        const systems = parseArray(pub.biological_systems);
        const matchesSystem = selectedSystem === 'all' || systems.includes(selectedSystem);
        const domains = parseArray(pub.research_domains);
        const matchesDomain = selectedDomain === 'all' || domains.some(d => d === selectedDomain);
        const matchesYear = yearFilter === 'all' || pub.publication_year === parseInt(yearFilter);
        const matchesDuration = durationFilter === 'all' || 
          (durationFilter === 'short' && pub.experiment_duration_days <= 30) ||
          (durationFilter === 'medium' && pub.experiment_duration_days > 30 && pub.experiment_duration_days <= 90) ||
          (durationFilter === 'long' && pub.experiment_duration_days > 90);
        
        return matchesSearch && matchesRelevance && matchesSystem && matchesDomain && matchesYear && matchesDuration;
      })
      .sort((a, b) => {
        if (sortBy === 'relevance') return (b.relevance_score || 0) - (a.relevance_score || 0);
        if (sortBy === 'complexity') return (b.space_complexity || 0) - (a.space_complexity || 0);
        if (sortBy === 'year') return (b.publication_year || 0) - (a.publication_year || 0);
        if (sortBy === 'duration') return (b.experiment_duration_days || 0) - (a.experiment_duration_days || 0);
        return 0;
      });
  }, [publications, searchTerm, selectedRelevance, selectedSystem, selectedDomain, yearFilter, durationFilter, sortBy]);

  const uniqueSystems = [...new Set(publications.flatMap(p => parseArray(p.biological_systems)))];
  const uniqueDomains = [...new Set(publications.flatMap(p => parseArray(p.research_domains)))];
  const uniqueYears = [...new Set(publications.map(p => p.publication_year).filter(Boolean))].sort((a, b) => b - a);

  const stats = useMemo(() => {
    const highRelevance = publications.filter(p => p.mission_relevance === 'high').length;
    const avgComplexity = publications.length > 0 
      ? (publications.reduce((sum, p) => sum + (p.space_complexity || 0), 0) / publications.length).toFixed(1)
      : 0;
    const totalFindings = publications.reduce((sum, p) => sum + (p.findings_count || 0), 0);
    const avgDuration = publications.filter(p => p.experiment_duration_days).length > 0
      ? Math.round(publications.reduce((sum, p) => sum + (p.experiment_duration_days || 0), 0) / 
        publications.filter(p => p.experiment_duration_days).length)
      : 0;

    return { highRelevance, avgComplexity, totalFindings, avgDuration, uniqueSystems: uniqueSystems.length };
  }, [publications, uniqueSystems]);

  const exportData = () => {
    const csvContent = [
      ['Title', 'PMCID', 'Relevance', 'Complexity', 'Year', 'Duration', 'Findings'],
      ...filteredPublications.map(pub => [
        pub.title,
        pub.pmcid,
        pub.mission_relevance,
        pub.space_complexity,
        pub.publication_year,
        pub.experiment_duration_days,
        pub.findings_count
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nasa_publications.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="w-10 h-10 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold">NASA Publications Analysis</h1>
                <p className="text-blue-300 text-sm">Space Biology Research Intelligence Platform</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportData}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={triggerProcessing}
                disabled={processing}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Process New Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-blue-300 text-sm mb-1">Total Publications</div>
            <div className="text-4xl font-bold">{publications.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-green-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-green-300 text-sm mb-1">High Relevance</div>
            <div className="text-4xl font-bold">{stats.highRelevance}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-yellow-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-yellow-300 text-sm mb-1">Avg Complexity</div>
            <div className="text-4xl font-bold">{stats.avgComplexity}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-purple-300 text-sm mb-1">Total Findings</div>
            <div className="text-4xl font-bold">{stats.totalFindings}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-pink-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <Beaker className="w-5 h-5 text-pink-400" />
            </div>
            <div className="text-pink-300 text-sm mb-1">Avg Duration</div>
            <div className="text-4xl font-bold">{stats.avgDuration}<span className="text-lg">d</span></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold">Filters</h3>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showFilters ? 'Hide' : 'Show'} Advanced
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search publications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              />
            </div>

            <select
              value={selectedRelevance}
              onChange={(e) => setSelectedRelevance(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="all">All Relevance</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="all">All Systems</option>
              {uniqueSystems.map(sys => (
                <option key={sys} value={sys}>{sys}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="relevance">Sort by Relevance</option>
              <option value="complexity">Sort by Complexity</option>
              <option value="year">Sort by Year</option>
              <option value="duration">Sort by Duration</option>
            </select>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/20">
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="all">All Research Domains</option>
                {uniqueDomains.map(domain => (
                  <option key={domain} value={domain}>{domain.replace(/_/g, ' ')}</option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="all">All Years</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="all">All Durations</option>
                <option value="short">Short (≤30 days)</option>
                <option value="medium">Medium (31-90 days)</option>
                <option value="long">Long (>90 days)</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
            <div className="text-sm text-gray-400">
              Showing {filteredPublications.length} of {publications.length} publications
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-blue-600' : 'bg-white/10'}`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-blue-600' : 'bg-white/10'}`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Publications */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          </div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-4">
            {filteredPublications.map((pub) => {
              const keyFindings = parseArray(pub.key_findings);
              const biologicalSystems = parseArray(pub.biological_systems);
              const researchDomains = parseArray(pub.research_domains);
              
              return (
                <div
                  key={pub.pmcid}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`${getRelevanceColor(pub.mission_relevance)} px-3 py-1 rounded-full text-xs font-bold`}>
                          {pub.mission_relevance?.toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm">{pub.pmcid}</span>
                        {pub.publication_year && (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {pub.publication_year}
                          </span>
                        )}
                        {pub.experiment_duration_days && (
                          <span className="text-sm text-gray-400">
                            {pub.experiment_duration_days} days
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-white">{pub.title}</h3>
                      <p className="text-gray-300 text-sm line-clamp-2">{pub.abstract}</p>
                    </div>
                    <button
                      onClick={() => setExpandedCard(expandedCard === pub.pmcid ? null : pub.pmcid)}
                      className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {expandedCard === pub.pmcid ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>

                  <div className="flex items-center gap-6 mb-4 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-300">Complexity:</span>
                      <span className={`font-bold ${getComplexityColor(pub.space_complexity)}`}>
                        {pub.space_complexity}/10
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Findings:</span>
                      <span className="font-bold">{keyFindings.length}</span>
                    </div>
                    {pub.citations_count > 0 && (
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">Citations:</span>
                        <span className="font-bold">{pub.citations_count}</span>
                      </div>
                    )}
                  </div>

                  {biologicalSystems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {biologicalSystems.map((sys, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-500/30 rounded-full text-xs border border-purple-500/50">
                          {sys}
                        </span>
                      ))}
                    </div>
                  )}

                  {expandedCard === pub.pmcid && (
                    <div className="mt-6 pt-6 border-t border-white/20">
                      {keyFindings.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-bold mb-3 text-blue-300">Key Findings</h4>
                          <ol className="space-y-2">
                            {keyFindings.map((finding, idx) => (
                              <li key={idx} className="flex gap-3">
                                <span className="text-blue-400 font-bold">{idx + 1}.</span>
                                <span className="text-gray-200">{finding}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {pub.ai_response && (
                        <div className="mb-6">
                          <h4 className="text-lg font-bold mb-3 text-green-300">AI Analysis</h4>
                          <div className="text-gray-200 whitespace-pre-line">
                            {pub.ai_response.split('\n').map((line, idx) => {
                              const parts = line.split(/\*\*(.*?)\*\*/g);
                              return (
                                <p key={idx} className="mb-2">
                                  {parts.map((part, i) => 
                                    i % 2 === 1 ? <strong key={i} className="font-bold text-white">{part}</strong> : part
                                  )}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {researchDomains.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-bold mb-3 text-yellow-300">Research Domains</h4>
                          <div className="flex flex-wrap gap-2">
                            {researchDomains.map((domain, idx) => (
                              <span key={idx} className="px-3 py-1 bg-yellow-500/30 rounded-lg text-sm border border-yellow-500/50">
                                {domain.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <a
                        href={pub.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Full Publication
                      </a>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredPublications.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No publications found matching your filters</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">PMCID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Relevance</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Complexity</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Year</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPublications.map((pub, idx) => (
                    <tr key={pub.pmcid} className={`border-t border-white/10 hover:bg-white/5 ${idx % 2 === 0 ? 'bg-white/5' : ''}`}>
                      <td className="px-4 py-3 text-sm">{pub.title}</td>
                      <td className="px-4 py-3 text-sm">{pub.pmcid}</td>
                      <td className="px-4 py-3">
                        <span className={`${getRelevanceColor(pub.mission_relevance)} px-2 py-1 rounded text-xs font-bold`}>
                          {pub.mission_relevance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{pub.space_complexity}/10</td>
                      <td className="px-4 py-3 text-sm">{pub.publication_year || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{pub.experiment_duration_days || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{pub.findings_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NASAPublicationsDashboard;