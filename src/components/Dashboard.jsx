import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  AppBar, Toolbar, Typography, Box, Grid, Card, CardContent, FormControl, InputLabel,
  Select, MenuItem, Container, Paper, Tabs, Tab
} from '@mui/material';
import PredictionTab from './PredictionTab';

// Colors for charts
const COLORS = ['#1976D2', '#14B8A6', '#EF4444', '#F59E0B', '#8B5CF6'];

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [tabValue, setTabValue] = useState(0);

  // Process and clean data
  const processAndCleanData = (rawData) => {
    const currentYear = new Date().getFullYear();
    return rawData
      .filter(row => row['totalRent'] && !isNaN(parseFloat(row['totalRent'])) && row['livingSpace'] && !isNaN(parseFloat(row['livingSpace'])))
      .map(row => ({
        ...row,
        totalRent: parseFloat(row['totalRent']) || 0,
        baseRent: parseFloat(row['baseRent']) || 0,
        livingSpace: parseFloat(row['livingSpace']) || 0,
        noRooms: parseFloat(row['noRooms']) || 0,
        yearConstructed: parseFloat(row['yearConstructed']) || 0,
        pricePerSqm: row['totalRent'] && row['livingSpace'] ? (parseFloat(row['totalRent']) / parseFloat(row['livingSpace'])).toFixed(2) : 0,
        regio1: row['regio1']?.trim() || 'Unknown',
        condition: row['condition']?.trim() || 'Unknown'
      }))
      .filter(row => row.totalRent > 0 && row.livingSpace > 0 && row.yearConstructed >= 1800 && row.yearConstructed <= currentYear);
  };

  // Load data
  useEffect(() => {
    Papa.parse('/immo_data_1.csv', {
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

  // Filter options
  const states = ['All', ...new Set(data.map(row => row.regio1))].sort();
  const conditions = ['All', ...new Set(data.map(row => row.condition).filter(c => c !== 'Unknown'))].sort();

  // Filtered data
  const filteredData = data.filter(row => 
    (stateFilter === 'All' || row.regio1 === stateFilter) &&
    (conditionFilter === 'All' || row.condition === conditionFilter)
  );

  // Data for bar chart
  const stateRentData = states
    .filter(state => state !== 'All')
    .map(state => {
      const stateData = filteredData.filter(row => row.regio1 === state);
      const avgRent = stateData.length > 0
        ? (stateData.reduce((sum, row) => sum + row.totalRent, 0) / stateData.length).toFixed(2)
        : 0;
      return { state, avgRent: parseFloat(avgRent) };
    })
    .filter(d => d.avgRent > 0)
    .sort((a, b) => b.avgRent - a.avgRent);

  // Data for pie chart
  const conditionData = conditions
    .filter(condition => condition !== 'All')
    .map(condition => {
      const count = filteredData.filter(row => row.condition === condition).length;
      return { name: condition, value: count };
    })
    .filter(d => d.value > 0);

  // Data for histogram
  const yearBins = [];
  const minYear = Math.min(...filteredData.map(row => row.yearConstructed).filter(y => y > 0)) || 1800;
  const maxYear = Math.max(...filteredData.map(row => row.yearConstructed).filter(y => y > 0)) || 2025;
  const binSize = 10;
  for (let year = Math.floor(minYear / binSize) * binSize; year <= maxYear; year += binSize) {
    const count = filteredData.filter(row => 
      row.yearConstructed >= year && row.yearConstructed < year + binSize && row.yearConstructed > 0
    ).length;
    yearBins.push({ year: `${year}-${year + binSize}`, count });
  }

  // Interesting fact
  const pricePerSqmByState = states
    .filter(state => state !== 'All')
    .map(state => {
      const stateData = filteredData.filter(row => row.regio1 === state);
      const avgPricePerSqm = stateData.length > 0
        ? (stateData.reduce((sum, row) => sum + parseFloat(row.pricePerSqm), 0) / stateData.length).toFixed(2)
        : 0;
      return { state, avgPricePerSqm: parseFloat(avgPricePerSqm) };
    })
    .filter(d => d.avgPricePerSqm > 0)
    .sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm);
  const highestPriceState = pricePerSqmByState[0] || { state: 'N/A', avgPricePerSqm: 0 };
  const lowestPriceState = pricePerSqmByState[pricePerSqmByState.length - 1] || { state: 'N/A', avgPricePerSqm: 0 };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6">Loading data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            German Real Estate Analytics
          </Typography>
        </Toolbar>
      </AppBar>
      {/* Tabs below AppBar */}
      <Box sx={{ bgcolor: 'background.paper' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} centered>
          <Tab label="Dashboard" />
          <Tab label="Prediction" />
        </Tabs>
      </Box>
      {/* Only show dashboard content if Dashboard tab is selected */}
      {tabValue === 0 && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Summary */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>Summary</Typography>
              <Typography variant="body1">
                This dashboard analyzes {filteredData.length} rental properties across Germany. Explore average rental prices, living space trends, property conditions, and construction years. Use the filters to dive deeper.
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>Interesting Fact:</strong> {highestPriceState.state} has the highest price per square meter (€{highestPriceState.avgPricePerSqm}/sqm), while {lowestPriceState.state} has the lowest (€{lowestPriceState.avgPricePerSqm}/sqm).
              </Typography>
            </CardContent>
          </Card>

          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={stateFilter}
                  label="State"
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  {states.map(state => (
                    <MenuItem key={state} value={state}>{state}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={conditionFilter}
                  label="Condition"
                  onChange={(e) => setConditionFilter(e.target.value)}
                >
                  {conditions.map(condition => (
                    <MenuItem key={condition} value={condition}>{condition}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Visualizations */}
          <Grid container spacing={2}>
            {/* Bar Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Average Total Rent by State</Typography>
                  <Box sx={{ height: 440, pt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stateRentData} margin={{ top: 20, right: 30, left: 100, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="state" angle={-30} textAnchor="end" fontSize={14} height={80}
                          label={{ value: 'State', position: 'insideBottom', offset: -60, fontSize: 16 }} />
                        <YAxis fontSize={14} label={{ value: 'Average Rent (€)', angle: -90, position: 'insideLeft', fontSize: 16, dy: 30 }} />
                        <Tooltip formatter={(value) => `€${value}`} />
                        <Bar dataKey="avgRent" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Scatter Plot */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Living Space vs. Total Rent</Typography>
                  <Box sx={{ height: 440, pt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, left: 100, bottom: 80 }}>
                        <CartesianGrid />
                        <XAxis dataKey="livingSpace" name="Living Space (sqm)" fontSize={14}
                          label={{ value: 'Living Space (sqm)', position: 'insideBottom', offset: -60, fontSize: 16 }} height={80} />
                        <YAxis dataKey="totalRent" name="Total Rent (€)" fontSize={14}
                          label={{ value: 'Total Rent (€)', angle: -90, position: 'insideLeft', fontSize: 16, dy: 30 }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => name === 'livingSpace' ? `${value} sqm` : `€${value}`} labelFormatter={() => ''} />
                        <Scatter name="Properties" data={filteredData.slice(0, 200)} fill={COLORS[2]} shape="circle" r={6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Pie Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Property Condition Distribution</Typography>
                  <Box sx={{ height: 500, pt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={conditionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={180}
                          innerRadius={80}
                          fill={COLORS[1]}
                          label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(1)}%)`}
                          labelLine={false}
                        >
                          {conditionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} properties`, name]} />
                        <Legend wrapperStyle={{ fontSize: 15 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Histogram */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Construction Year Distribution</Typography>
                  <Box sx={{ height: 440, pt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearBins} margin={{ top: 20, right: 30, left: 100, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" angle={-30} textAnchor="end" fontSize={14} height={80}
                          label={{ value: 'Construction Year (Range)', position: 'insideBottom', offset: -60, fontSize: 16 }} />
                        <YAxis fontSize={14} label={{ value: 'Number of Properties', angle: -90, position: 'insideLeft', fontSize: 16, dy: 30 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill={COLORS[4]} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Conclusion */}
          <Card sx={{ mt: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>Conclusion</Typography>
              <Typography variant="body1">
                The dashboard highlights significant rental price variations across German states, with {highestPriceState.state} leading at €{highestPriceState.avgPricePerSqm}/sqm. The scatter plot shows a positive correlation between living space and rent. Most properties are refurbished or well-kept, and newer constructions are prevalent. Explore further using the filters above.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      )}
      {tabValue === 1 && (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <PredictionTab data={data} states={states} conditions={conditions} />
        </Container>
      )}
      {/* Optionally, show a placeholder for Prediction tab in the future */}
    </Box>
  );
};

export default Dashboard;