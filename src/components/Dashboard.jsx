import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  AppBar, Toolbar, Typography, Box, Grid, Card, CardContent, FormControl, InputLabel,
  Select, MenuItem, Container, Paper, Tabs, Tab, Chip, OutlinedInput, Checkbox
} from '@mui/material';
import PredictionTab from './Prediction';

// Distinct color palette for donut chart (ColorBrewer Set1 + extra distinct colors)
const COLORS = [
  '#e41a1c', // red
  '#377eb8', // blue
  '#4daf4a', // green
  '#984ea3', // purple
  '#ff7f00', // orange
  '#a65628', // brown
  '#f781bf', // pink
  '#999999', // gray
  '#1b9e77', // teal
  '#d95f02', // dark orange
  '#7570b3', // indigo
  '#e7298a', // magenta
  '#252525', // near-black
  '#005f73', // dark teal
  '#6a3d9a', // deep violet
  '#b15928', // dark brown
  '#264653', // dark blue-gray
  '#22223b', // very dark blue
];

// Professional color scheme for features
const FEATURE_COLORS = {
  positive: '#22C55E', // Green for positive values
  negative: '#EF4444', // Red for negative values
  primary: '#1976D2',  // Primary blue
  secondary: '#14B8A6', // Teal
  tertiary: '#F59E0B'   // Orange
};

// Standardized chart configuration for side-by-side layout
const CHART_CONFIG = {
  barSize: 40, // Slightly smaller bars for side-by-side layout
  barCategoryGap: '15%', // Reduced gap for compact layout
  margin: { top: 20, right: 20, left: 40, bottom: 80 }, // Optimized margins
  height: 350, // Reduced height for better fit
  fontSize: {
    axis: 11,
    label: 13,
    title: 15
  },
  gridStyle: {
    strokeDasharray: '3 3',
    stroke: '#E0E0E0',
    strokeWidth: 1
  }
};

const REGION_LEVELS = [
  { value: 'regio1', label: 'State (Bundesland)' },
  { value: 'regio2', label: 'District' },
  { value: 'regio3', label: 'City' },
];

// Menu props for multi-select
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

// Custom label function for donut chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
  if (percent < 0.05) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="11"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Utility function to clean up region names
const cleanRegionName = (name) =>
  name
    .replace(/_/g, ' ')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã„/g, 'Ä')
    .replace(/ÃŸ/g, 'ß');

// Utility to capitalize first letter of each word
const capitalizeWords = (str) =>
  str.replace(/\b\w/g, c => c.toUpperCase());

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStates, setSelectedStates] = useState([]); // Changed from stateFilter to selectedStates array
  const [conditionFilter, setConditionFilter] = useState('All');
  const [tabValue, setTabValue] = useState(0);
  const [regionLevel, setRegionLevel] = useState('regio1');
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [apartmentTypes, setApartmentTypes] = useState([]);
  const [selectedApartmentType, setSelectedApartmentType] = useState('All');
  const [propertyCondition, setPropertyCondition] = useState('All');

  // Process and clean data (full data, no sampling)
  const processAndCleanData = (rawData) => {
    const currentYear = new Date().getFullYear();
    const cleaned = [];
    for (let i = 0; i < rawData.length; ++i) {
      const row = rawData[i];
      const totalRent = parseFloat(row['totalRent']) || 0;
      const livingSpace = parseFloat(row['livingSpace']) || 0;
      const yearConstructed = parseFloat(row['yearConstructed']) || 0;
      if (
        row['totalRent'] && !isNaN(totalRent) &&
        row['livingSpace'] && !isNaN(livingSpace) &&
        totalRent > 0 && livingSpace > 0 &&
        yearConstructed >= 1800 && yearConstructed <= currentYear
      ) {
        cleaned.push({
          ...row,
          totalRent,
          baseRent: parseFloat(row['baseRent']) || 0,
          livingSpace,
          noRooms: parseFloat(row['noRooms']) || 0,
          yearConstructed,
          serviceCharge: parseFloat(row['serviceCharge']) || 0,
          heatingCosts: parseFloat(row['heatingCosts']) || 0,
          pricePerSqm: totalRent && livingSpace ? (totalRent / livingSpace).toFixed(2) : 0,
          regio1: row['regio1']?.trim() || 'Unknown',
          condition: row['condition']?.trim() || 'Unknown'
        });
      }
    }
    return cleaned;
  };

  // Load data
  useEffect(() => {
    Papa.parse(import.meta.env.BASE_URL + 'immo_data_1.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: header => header.trim().replace(/^"|"$/g, ''),
      transform: (value, header) => value.trim().replace(/^"|"$/g, ''),
      complete: (results) => {
        const cleanedData = processAndCleanData(results.data);
        setData(cleanedData);
        setLoading(false);
      },
      error: (err) => {
        console.error('Error parsing CSV:', err);
        setLoading(false);
      }
    });
  }, []);

  // Filter options - Updated for multi-select
  const allStates = [...new Set(data.map(row => cleanRegionName(row.regio1)))].sort();
  const conditions = ['All', ...new Set(data.map(row => row.condition).filter(c => c !== 'Unknown'))].sort();

  // Filtered data - Updated to handle multiple states and 'All' option
  const filteredData = data.filter(row => {
    const allSelected = selectedStates.includes('All') || selectedStates.length === 0;
    const stateMatch = allSelected || selectedStates.includes(cleanRegionName(row.regio1));
    const conditionMatch = conditionFilter === 'All' || row.condition === conditionFilter;
    return stateMatch && conditionMatch;
  });

  // KPI Calculations (GLOBAL, not filtered)
  const globalKpiData = {
    totalProperties: data.length,
    averageRent: data.length > 0 
      ? (data.reduce((sum, row) => sum + row.totalRent, 0) / data.length).toFixed(0)
      : 0,
    averagePricePerSqm: data.length > 0
      ? (data.reduce((sum, row) => sum + parseFloat(row.pricePerSqm), 0) / data.length).toFixed(2)
      : 0,
    averageLivingSpace: data.length > 0
      ? (data.reduce((sum, row) => sum + row.livingSpace, 0) / data.length).toFixed(0)
      : 0,
    totalStates: allStates.length,
    averageRooms: data.length > 0
      ? (data.reduce((sum, row) => sum + row.noRooms, 0) / data.length).toFixed(1)
      : 0
  };

  // Data for price per m² chart by state - Updated to show only selected states or all if none selected
  const statePricePerSqmData = (selectedStates.length === 0 || selectedStates.includes('All') ? allStates : selectedStates)
    .map(state => {
      const stateData = filteredData.filter(row => cleanRegionName(row.regio1) === state);
      const avgPricePerSqm = stateData.length > 0
        ? (stateData.reduce((sum, row) => sum + parseFloat(row.pricePerSqm), 0) / stateData.length).toFixed(2)
        : 0;
      return { 
        state, 
        avgPricePerSqm: parseFloat(avgPricePerSqm),
        propertyCount: stateData.length
      };
    })
    .filter(d => d.avgPricePerSqm > 0)
    .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm);

  // Data for donut chart
  const conditionDonutData = conditions
    .filter(condition => condition !== 'All' && condition.toLowerCase() !== 'negotiable')
    .map((condition, index) => {
      const count = filteredData.filter(row => row.condition === condition).length;
      const percentage = filteredData.length > 0 ? ((count / filteredData.length) * 100).toFixed(1) : 0;
      return { 
        name: condition, 
        value: count, 
        percentage: parseFloat(percentage),
        fill: COLORS[index % COLORS.length]
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const mostCommonCondition = conditionDonutData.length > 0 ? conditionDonutData[0] : null;

  // Data for construction year area chart
  const yearAreaData = (() => {
    const yearCounts = {};
    filteredData.forEach(row => {
      if (row.yearConstructed > 0) {
        const year = Math.floor(row.yearConstructed / 5) * 5;
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    return Object.entries(yearCounts)
      .map(([year, count]) => ({ 
        year: parseInt(year), 
        count,
        yearRange: `${year}-${parseInt(year) + 4}`
      }))
      .sort((a, b) => a.year - b.year);
  })();

  // Data for average rent by construction year
  const rentByConstructionYearData = (() => {
    const yearRents = {};
    filteredData.forEach(row => {
      if (row.yearConstructed > 0 && row.totalRent > 0) {
        // Group by decade for better visualization
        const decade = Math.floor(row.yearConstructed / 10) * 10;
        if (!yearRents[decade]) {
          yearRents[decade] = { totalRent: 0, count: 0 };
        }
        yearRents[decade].totalRent += row.totalRent;
        yearRents[decade].count += 1;
      }
    });
    
    return Object.entries(yearRents)
      .map(([decade, data]) => ({
        decade: `${decade}s`,
        avgRent: parseFloat((data.totalRent / data.count).toFixed(2)),
        propertyCount: data.count,
        decadeNumber: parseInt(decade)
      }))
      .filter(d => d.propertyCount >= 5) // Only include decades with sufficient data
      .sort((a, b) => a.decadeNumber - b.decadeNumber);
  })();

  // Feature impact data calculation
  const featureImpactData = (() => {
    const features = ['balcony', 'garden', 'lift'];
    const results = [];
    
    features.forEach(featureName => {
      const yesData = filteredData.filter(row => 
        String(row[featureName]).toLowerCase() === 'true' || 
        String(row[featureName]).toLowerCase() === 'yes'
      );
      const noData = filteredData.filter(row => 
        String(row[featureName]).toLowerCase() !== 'true' && 
        String(row[featureName]).toLowerCase() !== 'yes'
      );
      
      const avgRentYes = yesData.length > 0 ? 
        (yesData.reduce((sum, row) => sum + row.totalRent, 0) / yesData.length) : 0;
      const avgRentNo = noData.length > 0 ? 
        (noData.reduce((sum, row) => sum + row.totalRent, 0) / noData.length) : 0;
      
      results.push({
        feature: featureName.charAt(0).toUpperCase() + featureName.slice(1),
        Yes: parseFloat(avgRentYes.toFixed(2)),
        No: parseFloat(avgRentNo.toFixed(2)),
        yesCount: yesData.length,
        noCount: noData.length
      });
    });
    
    return results;
  })();

  // Affordability data calculation - Updated to show only selected states or all regions
  const affordabilityData = (() => {
    let filtered = filteredData;
    if (propertyCondition !== 'All') {
      filtered = filtered.filter(row => row.condition === propertyCondition);
    }

    const groupKey = row => cleanRegionName(row.regio1);
    const groups = {};
    filtered.forEach(row => {
      const key = groupKey(row);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    return Object.entries(groups).map(([region, rows]) => {
      const avgBaseRent = rows.length > 0 ? 
        (rows.reduce((sum, r) => sum + (parseFloat(r.baseRent) || 0), 0) / rows.length) : 0;
      const avgServiceCharge = rows.length > 0 ? 
        (rows.reduce((sum, r) => sum + (parseFloat(r.serviceCharge) || 0), 0) / rows.length) : 0;
      const avgHeatingCosts = rows.length > 0 ? 
        (rows.reduce((sum, r) => sum + (parseFloat(r.heatingCosts) || 0), 0) / rows.length) : 0;
      
      return {
        region,
        avgBaseRent: parseFloat(avgBaseRent.toFixed(2)),
        avgServiceCharge: parseFloat(avgServiceCharge.toFixed(2)),
        avgHeatingCosts: parseFloat(avgHeatingCosts.toFixed(2)),
        totalRent: parseFloat((avgBaseRent + avgServiceCharge + avgHeatingCosts).toFixed(2))
      };
    }).filter(d => d.totalRent > 0)
      .sort((a, b) => b.totalRent - a.totalRent);
  })();

  // Handle multi-select state change
  const handleStateChange = (event) => {
    const value = event.target.value;
    setSelectedStates(typeof value === 'string' ? value.split(',') : value);
  };

  // Handle state chip deletion
  const handleDeleteState = (stateToDelete) => {
    setSelectedStates((states) => states.filter((state) => cleanRegionName(state) !== stateToDelete));
  };

  const handleRegionChange = (event) => {
    const value = event.target.value;

    // If 'All' is checked
    if (value.includes('All')) {
      // If 'All' was not previously selected, select all regions (UI shows only 'All')
      if (!selectedStates.includes('All')) {
        setSelectedStates(['All']);
      } else {
        // If 'All' is unchecked, clear selection
        setSelectedStates([]);
      }
      return;
    }

    // If all regions are manually checked, auto-select 'All'
    if (value.length === allStates.length) {
      setSelectedStates(['All']);
      return;
    }

    // If any region is deselected when 'All' is selected, remove 'All' and select only the checked set
    if (selectedStates.includes('All') && value.length < allStates.length) {
      setSelectedStates(value);
      return;
    }

    // Otherwise, just set the selected regions
    setSelectedStates(value);
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4, textAlign: 'center' }}>
          Loading data...
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            German Real Estate Analytics
          </Typography>
        </Toolbar>
      </AppBar>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} centered>
        <Tab label="Dashboard" />
        <Tab label="Prediction" />
      </Tabs>

      {tabValue === 0 && (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Box display="flex" gap={3}>
            {/* Left side: KPI Cards and Charts */}
            <Box flexGrow={1}>
              {/* KPI Cards Section (GLOBAL) */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {/* Removed Total Properties KPI card */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)',
                    color: 'white',
                    height: '100px'
                  }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        €{parseFloat(globalKpiData.averageRent).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                        Avg. Total Rent
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: 'white',
                    height: '100px'
                  }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        €{globalKpiData.averagePricePerSqm}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                        Price per m²
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: 'white',
                    height: '100px'
                  }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {globalKpiData.averageLivingSpace}m²
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                        Avg. Living Space
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>  
              </Grid>

              {/* SIDE-BY-SIDE LAYOUT ROW 1: Price per m² & Rent Breakdown */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: CHART_CONFIG.fontSize.title, fontWeight: 'bold', mb: 2 }}>
                        Average Price per m² by State
                      </Typography>
                      <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
                        <BarChart 
                          data={statePricePerSqmData}
                          margin={CHART_CONFIG.margin}
                          barCategoryGap={CHART_CONFIG.barCategoryGap}
                        >
                          <CartesianGrid 
                            strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
                            stroke={CHART_CONFIG.gridStyle.stroke}
                            strokeWidth={CHART_CONFIG.gridStyle.strokeWidth}
                          />
                          <XAxis 
                            dataKey="state" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            interval={0}
                            tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{ value: 'Region', position: 'insideBottom', offset: -60, fontSize: CHART_CONFIG.fontSize.label }}
                          />
                          <YAxis 
                            tickFormatter={value => `€${value}/m²`}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{
                              value: 'Avg. Price per m² (€)', 
                              angle: -90, 
                              position: 'insideLeft', 
                              offset: 0, 
                              fontSize: CHART_CONFIG.fontSize.label, 
                              dy: 40
                            }}
                            
                          />
                          <Tooltip 
                            formatter={(value, name) => [`€${value}/m²`, 'Price per m²']}
                            labelFormatter={(label) => `State: ${label}`}
                            labelStyle={{ fontWeight: 'bold', fontSize: CHART_CONFIG.fontSize.axis }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Bar 
                            dataKey="avgPricePerSqm" 
                            fill={FEATURE_COLORS.primary}
                            name="Price per m²"
                            barSize={CHART_CONFIG.barSize}
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          fontSize: CHART_CONFIG.fontSize.title,
                          fontWeight: 'bold',
                          mb: 2
                        }}
                      >
                        Total Rent Breakdown by Region
                      </Typography>
                      <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
                        <BarChart
                          data={affordabilityData}
                          margin={CHART_CONFIG.margin}
                          barCategoryGap={CHART_CONFIG.barCategoryGap}
                        >
                          <CartesianGrid
                            strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
                            stroke={CHART_CONFIG.gridStyle.stroke}
                            strokeWidth={CHART_CONFIG.gridStyle.strokeWidth}
                          />
                          <XAxis
                            dataKey="region"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            interval={0}
                            tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{
                              value: 'Region',
                              position: 'insideBottom',
                              offset: -60,
                              fontSize: CHART_CONFIG.fontSize.label
                            }}
                          />
                          <YAxis
                            tickFormatter={value => `€${value}`}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{
                              value: 'Total Rent (€)',
                              angle: -90,
                              position: 'insideLeft',
                              fontSize: CHART_CONFIG.fontSize.label,
                              dy: 40
                            }}
                          />
                          <Tooltip 
                            formatter={(value, name, props) => {
                              // Find the current region's data from the payload
                              const regionData = props && props.payload && props.payload[0];
                              if (regionData && regionData.payload) {
                                const { avgBaseRent, avgServiceCharge, avgHeatingCosts } = regionData.payload;
                                const total = (avgBaseRent || 0) + (avgServiceCharge || 0) + (avgHeatingCosts || 0);
                                if (name === 'Base Rent') {
                                  return [`€${parseFloat(value).toFixed(2)}`, `${name}`];
                                } else if (name === 'Service Charge') {
                                  return [`€${parseFloat(value).toFixed(2)}`, `${name}`];
                                } else if (name === 'Heating Costs') {
                                  return [`€${parseFloat(value).toFixed(2)}`, `${name}`];
                                } else {
                                  return [`€${parseFloat(value).toFixed(2)}`, `${name}`];
                                }
                              }
                              return [`€${parseFloat(value).toFixed(2)}`, name];
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                const d = payload[0].payload;
                                const total = (d.avgBaseRent || 0) + (d.avgServiceCharge || 0) + (d.avgHeatingCosts || 0);
                                return `Region: ${label} | Total Rent: €${total.toFixed(2)}`;
                              }
                              return `Region: ${label}`;
                            }}
                            labelStyle={{ fontWeight: 'bold', fontSize: CHART_CONFIG.fontSize.axis }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Bar
                            dataKey="avgBaseRent"
                            stackId="totalRent"
                            fill={FEATURE_COLORS.primary}
                            name="Base Rent"
                            barSize={CHART_CONFIG.barSize}
                          />
                          <Bar
                            dataKey="avgServiceCharge"
                            stackId="totalRent"
                            fill={FEATURE_COLORS.secondary}
                            name="Service Charge"
                            barSize={CHART_CONFIG.barSize}
                          />
                          <Bar
                            dataKey="avgHeatingCosts"
                            stackId="totalRent"
                            fill={FEATURE_COLORS.tertiary}
                            name="Heating Costs"
                            barSize={CHART_CONFIG.barSize}
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      {/* --- Custom Legend Below Chart --- */}
                      <Box display="flex" justifyContent="center" mt={2}>
                        <Box display="flex" alignItems="center" mr={2}>
                          <Box
                            width={16}
                            height={16}
                            bgcolor={FEATURE_COLORS.primary}
                            mr={1}
                            borderRadius={1}
                          />
                          <Typography variant="body2">Base Rent</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" mr={2}>
                          <Box
                            width={16}
                            height={16}
                            bgcolor={FEATURE_COLORS.secondary}
                            mr={1}
                            borderRadius={1}
                          />
                          <Typography variant="body2">Service Charge</Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                          <Box
                            width={16}
                            height={16}
                            bgcolor={FEATURE_COLORS.tertiary}
                            mr={1}
                            borderRadius={1}
                          />
                          <Typography variant="body2">Heating Costs</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* SIDE-BY-SIDE LAYOUT ROW 2: Feature Impact & Property Condition */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: CHART_CONFIG.fontSize.title, fontWeight: 'bold', mb: 2 }}>
                        Effect of Property Features on Rent
                      </Typography>
                      <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
                        <BarChart 
                          data={featureImpactData}
                          margin={CHART_CONFIG.margin}
                          barCategoryGap={CHART_CONFIG.barCategoryGap}
                        >
                          <CartesianGrid 
                            strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
                            stroke={CHART_CONFIG.gridStyle.stroke}
                            strokeWidth={CHART_CONFIG.gridStyle.strokeWidth}
                          />
                          <XAxis 
                            dataKey="feature"
                            fontSize={CHART_CONFIG.fontSize.axis}
                            tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{ value: 'Feature', position: 'insideBottom', offset: -10, fontSize: CHART_CONFIG.fontSize.label }}
                          />
                          <YAxis 
                            tickFormatter={value => `€${value}`}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{ value: 'Avg. Rent (€)', angle: -90, position: 'insideLeft', fontSize: CHART_CONFIG.fontSize.label }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [`€${value}`, name]}
                            labelFormatter={(label) => `${label} Feature`}
                            labelStyle={{ fontWeight: 'bold', fontSize: CHART_CONFIG.fontSize.axis }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: CHART_CONFIG.fontSize.axis, marginTop: 50 }}
                          />
                          <Bar 
                            dataKey="Yes" 
                            fill={FEATURE_COLORS.positive}
                            name="Yes"
                            barSize={CHART_CONFIG.barSize}
                            radius={[2, 2, 0, 0]}
                          />
                          <Bar 
                            dataKey="No" 
                            fill={FEATURE_COLORS.negative}
                            name="No"
                            barSize={CHART_CONFIG.barSize}
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          fontSize: CHART_CONFIG.fontSize.title,
                          fontWeight: 'bold',
                          mb: 2
                        }}
                      >
                        Property Condition Distribution
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          height: CHART_CONFIG.height,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <Pie
                              data={conditionDonutData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius="90%"
                              innerRadius="60%"
                              fill="#8884d8"
                              dataKey="value"
                              stroke="#fff"
                              strokeWidth={2}
                            >
                              {conditionDonutData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name, props) => [
                                `${capitalizeWords(cleanRegionName(props.payload.name))} - ${value} properties`,
                            
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* SIDE-BY-SIDE LAYOUT ROW 3: Construction Year Distribution & Average Rent by Construction Year */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: CHART_CONFIG.fontSize.title, fontWeight: 'bold', mb: 2 }}>
                        Construction Year Distribution Over Time
                      </Typography>
                      <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
                        <AreaChart data={yearAreaData} margin={CHART_CONFIG.margin}>
                          <CartesianGrid 
                            strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
                            stroke={CHART_CONFIG.gridStyle.stroke}
                          />
                          <XAxis 
                            dataKey="year" 
                            tickFormatter={value => `${value}s`}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{ value: 'Construction Year', position: 'insideBottom', offset: -10, fontSize: CHART_CONFIG.fontSize.label }}
                          />
                          <YAxis 
                            fontSize={CHART_CONFIG.fontSize.axis}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{ value: 'Property Count', angle: -90, position: 'insideLeft', fontSize: CHART_CONFIG.fontSize.label }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [`${value} properties`, 'Count']}
                            labelFormatter={(label) => `${label}-${label + 4} period`}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke={COLORS[2]} 
                            fill={COLORS[2]}
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: CHART_CONFIG.fontSize.title, fontWeight: 'bold', mb: 2 }}>
                        Average Rent by Construction Year
                      </Typography>
                      <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
                        <LineChart 
                          data={rentByConstructionYearData}
                          margin={CHART_CONFIG.margin}
                        >
                          <CartesianGrid 
                            strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
                            stroke={CHART_CONFIG.gridStyle.stroke}
                            strokeWidth={CHART_CONFIG.gridStyle.strokeWidth}
                          />
                          <XAxis 
                            dataKey="decade"
                            fontSize={CHART_CONFIG.fontSize.axis}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            label={{ value: 'Construction Decade', position: 'insideBottom', offset:10, fontSize: CHART_CONFIG.fontSize.label }}
                          />
                          <YAxis 
                            tickFormatter={value => `€${value}`}
                            fontSize={CHART_CONFIG.fontSize.axis}
                            axisLine={{ stroke: '#666', strokeWidth: 1 }}
                            tickLine={{ stroke: '#666', strokeWidth: 1 }}
                            label={{ 
                              value: 'Average Rent (€)', 
                              angle: -90, 
                              position: 'insideLeft',
                              style: { textAnchor: 'middle', fontSize: CHART_CONFIG.fontSize.label }
                            }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [`€${value}`, 'Average Rent']}
                            labelFormatter={(label) => `Properties built in ${label}`}
                            labelStyle={{ fontWeight: 'bold', fontSize: CHART_CONFIG.fontSize.axis }}
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avgRent" 
                            stroke={FEATURE_COLORS.secondary}
                            strokeWidth={3}
                            dot={{ fill: FEATURE_COLORS.secondary, strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: FEATURE_COLORS.secondary, strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Right side: Filters - Updated with Multi-Select States */}
            <Box width="280px" sx={{ position: 'sticky', top: 20, height: 'fit-content' }}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', mb: 2 }}>
                    Dashboard Filter
                  </Typography>
                  
                  {/* Multi-Select Region Filter */}
                  <FormControl fullWidth margin="dense" size="small">
                    <InputLabel id="region-label">Region</InputLabel>
                    <Select
                      labelId="region-label"
                      multiple
                      value={selectedStates}
                      onChange={handleRegionChange}
                      input={<OutlinedInput label="Region" placeholder="Region" />}
                      renderValue={selected => {
                        if (selected.includes('All')) return 'All Regions';
                        if (selected.length === 0) return 'No Region Selected';
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map(value => (
                              <Chip
                                key={value}
                                label={cleanRegionName(value)}
                                onDelete={() => handleDeleteState(value)}
                                deleteIcon={<span>&times;</span>}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', '& .MuiChip-deleteIcon': { fontSize: '1rem', width: 16, height: 16 } }}
                              />
                            ))}
                          </Box>
                        );
                      }}
                      MenuProps={MenuProps}
                    >
                      <MenuItem value="All">
                        <Checkbox checked={selectedStates.includes('All')} />
                        All
                      </MenuItem>
                      {allStates.map(state => (
                        <MenuItem key={state} value={state} disabled={selectedStates.includes('All')}>
                          <Checkbox checked={!selectedStates.includes('All') && selectedStates.includes(state)} />
                          {cleanRegionName(state)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>
      )}

{tabValue === 1 && (
  <PredictionTab data={data} />
)}
    </Box>
  );
};

export default Dashboard;
