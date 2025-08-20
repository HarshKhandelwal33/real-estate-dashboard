import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Label
} from 'recharts';
import {
  AppBar, Toolbar, Typography, Box, Grid, Card, CardContent, FormControl, InputLabel,
  Select, MenuItem, Paper, Chip, OutlinedInput, Checkbox, useMediaQuery, Container
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PredictionTab from './Prediction';

/* ------------------ Colors & Config ------------------ */
const COLORS = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#a65628','#f781bf','#999999',
  '#1b9e77','#d95f02','#7570b3','#e7298a','#252525','#005f73','#6a3d9a','#b15928','#264653','#22223b'];

const FEATURE_COLORS = {
  positive: '#22C55E', negative: '#EF4444',
  primary:  '#1976D2', secondary:'#14B8A6', tertiary: '#F59E0B'
};

/* Chart config */
const CHART = {
  barSize: 28,
  barGap: '12%',
  // Row-1 (rotated labels) needs more bottom space
  margin: { top: 6, right: 8, left: 18, bottom: 50 },
  axisFs: { tick: 11, label: 13, title: 15 },
  grid: { dash: '3 3', stroke: '#E0E0E0' }
};

// Row-2: shared margins & axis heights so baselines line up
const ROW2_MARGIN = { top: 6, right: 8, left: 18, bottom: 60 };
const ROW2_XAXIS_HEIGHT = 36;

/* Heights */
const H = { xs: 260, md: 310, lg: 340 };

/* Multi-select menu */
const ITEM_HEIGHT = 42, ITEM_PADDING_TOP = 6;
const MenuProps = { PaperProps: { style: { maxHeight: ITEM_HEIGHT * 5 + ITEM_PADDING_TOP, width: 260 } } };

/* Helpers */
const cleanRegionName = (name) => (name || '')
  .replace(/_/g, ' ')
  .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
  .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
  .replace(/Ã¤/g, 'ä').replace(/Ã„/g, 'Ä')
  .replace(/ÃŸ/g, 'ß');

const capitalize = (s) => s.replace(/\b\w/g, c => c.toUpperCase());

/* Donut % labels inside the ring */
const RAD = Math.PI / 180;
const renderDonutPercent = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null; // skip tiny slices
  const r = innerRadius + (outerRadius - innerRadius) * 0.55; // middle of ring
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#fff"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

export default function Dashboard() {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const [selectedStates, setSelectedStates] = useState([]);
  const [conditionFilter, setCondition] = useState('All');

  /* -------- load & clean csv -------- */
  useEffect(() => {
    Papa.parse(import.meta.env.BASE_URL + 'immo_data_1.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().replace(/^"|"$/g, ''),
      transform: v => (v ?? '').toString().trim().replace(/^"|"$/g, ''),
      complete: (res) => {
        const currentYear = new Date().getFullYear();
        const cleaned = res.data.map(r => ({
          ...r,
          totalRent: +r.totalRent || 0,
          baseRent: +r.baseRent || 0,
          livingSpace: +r.livingSpace || 0,
          noRooms: +r.noRooms || 0,
          yearConstructed: +r.yearConstructed || 0,
          serviceCharge: +r.serviceCharge || 0,
          heatingCosts: +r.heatingCosts || 0,
          pricePerSqm: (+r.totalRent && +r.livingSpace) ? (+r.totalRent / +r.livingSpace).toFixed(2) : 0,
          regio1: r.regio1?.trim() || 'Unknown',
          condition: r.condition?.trim() || 'Unknown'
        })).filter(x =>
          x.totalRent > 0 && x.livingSpace > 0 &&
          x.yearConstructed >= 1800 && x.yearConstructed <= currentYear
        );
        setData(cleaned); setLoading(false);
      },
      error: () => setLoading(false)
    });
  }, []);

  const allStates = [...new Set(data.map(r => cleanRegionName(r.regio1)))].sort();
  const conditions = ['All', ...new Set(data.map(r => r.condition).filter(c => c !== 'Unknown'))].sort();

  const filtered = data.filter(r => {
    const any = selectedStates.includes('All') || selectedStates.length === 0;
    const stateOk = any || selectedStates.includes(cleanRegionName(r.regio1));
    const condOk = conditionFilter === 'All' || r.condition === conditionFilter;
    return stateOk && condOk;
  });

  const KPIs = {
    avgRent: data.length ? (data.reduce((s, r) => s + r.totalRent, 0) / data.length).toFixed(0) : 0,
    avgPpsm: data.length ? (data.reduce((s, r) => s + (+r.pricePerSqm), 0) / data.length).toFixed(2) : 0,
    avgSqm:  data.length ? (data.reduce((s, r) => s + r.livingSpace, 0) / data.length).toFixed(0) : 0,
  };

  /* -------- datasets -------- */
  const dStatePpsm = (selectedStates.length === 0 || selectedStates.includes('All') ? allStates : selectedStates)
    .map(state => {
      const rows = filtered.filter(r => cleanRegionName(r.regio1) === state);
      const avg = rows.length ? (rows.reduce((s,r)=>s+ +r.pricePerSqm,0)/rows.length).toFixed(2) : 0;
      return { state, avgPricePerSqm: +avg, n: rows.length };
    }).filter(d=>d.avgPricePerSqm>0).sort((a,b)=>b.avgPricePerSqm-a.avgPricePerSqm);

  const dAfford = (() => {
    const groups = {};
    filtered.forEach(r => (groups[cleanRegionName(r.regio1)] ||= []).push(r));
    return Object.entries(groups).map(([region, rows]) => {
      const avgBase = rows.reduce((s,r)=>s+(+r.baseRent||0),0)/rows.length || 0;
      const avgSvc  = rows.reduce((s,r)=>s+(+r.serviceCharge||0),0)/rows.length || 0;
      const avgHeat = rows.reduce((s,r)=>s+(+r.heatingCosts||0),0)/rows.length || 0;
      return { region, avgBaseRent:+avgBase.toFixed(2), avgServiceCharge:+avgSvc.toFixed(2), avgHeatingCosts:+avgHeat.toFixed(2),
        totalRent:+(avgBase+avgSvc+avgHeat).toFixed(2) };
    }).filter(d=>d.totalRent>0).sort((a,b)=>b.totalRent-a.totalRent);
  })();

  const dCondition = conditions
    .filter(c => c !== 'All' && c.toLowerCase() !== 'negotiable')
    .map((c,i) => {
      const cnt = filtered.filter(r=>r.condition===c).length;
      return { name:c, value:cnt, fill:COLORS[i%COLORS.length] };
    }).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  const dYearArea = (() => {
    const m = {};
    filtered.forEach(r => {
      const y = Math.floor(r.yearConstructed / 5) * 5;
      m[y] = (m[y]||0)+1;
    });
    return Object.entries(m).map(([y,c])=>({year:+y,count:c})).sort((a,b)=>a.year-b.year);
  })();

  const dRentByDecade = (() => {
    const m = {};
    filtered.forEach(r=>{
      const d = Math.floor(r.yearConstructed/10)*10;
      (m[d] ||= {t:0,n:0}); m[d].t += r.totalRent; m[d].n += 1;
    });
    return Object.entries(m).map(([d,v])=>({decade:`${d}s`,decadeNumber:+d,avgRent:+(v.t/v.n).toFixed(2),n:v.n}))
      .filter(x=>x.n>=5).sort((a,b)=>a.decadeNumber-b.decadeNumber);
  })();

  const dFeatureImpact = (() => {
    const list = ['balcony','garden','lift'];
    return list.map(f=>{
      const yes = filtered.filter(r => String(r[f]).toLowerCase()==='true' || String(r[f]).toLowerCase()==='yes');
      const no  = filtered.filter(r => !(String(r[f]).toLowerCase()==='true' || String(r[f]).toLowerCase()==='yes'));
      const ay = yes.length? yes.reduce((s,r)=>s+r.totalRent,0)/yes.length : 0;
      const an = no.length ? no.reduce((s,r)=>s+r.totalRent,0)/no.length : 0;
      return { feature: f[0].toUpperCase()+f.slice(1), Yes:+ay.toFixed(2), No:+an.toFixed(2) };
    });
  })();

  /* ---- ticks every 20 years for the area chart ---- */
  const yearTicks = useMemo(() => {
    if (!dYearArea.length) return [];
    const min = dYearArea[0].year;
    const max = dYearArea[dYearArea.length - 1].year;
    const start = Math.ceil(min / 20) * 20;
    const t = [];
    for (let y = start; y <= max; y += 20) t.push(y);
    return t;
  }, [dYearArea]);

  /* -------- handlers -------- */
  const onRegionChange = (e) => {
    const v = e.target.value;
    if (v.includes('All')) { setSelectedStates(selectedStates.includes('All')?[]:['All']); return; }
    if (v.length === allStates.length) { setSelectedStates(['All']); return; }
    if (selectedStates.includes('All') && v.length < allStates.length) { setSelectedStates(v); return; }
    setSelectedStates(v);
  };
  const delState = (s) => setSelectedStates(prev => prev.filter(x => cleanRegionName(x) !== s));

  if (loading) return <Box sx={{ p: 3, textAlign:'center' }}>Loading data…</Box>;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary" elevation={1}>
  <Toolbar sx={{ gap: 1, minHeight: 64 }}>
    <Typography variant={isSm ? 'subtitle1' : 'h6'}>
      German Rental Analysis
    </Typography>

    {/* KPIs inline - show only on Dashboard tab */}
    {tab === 0 && (
      <Box sx={{ flex: 1, 
      display: 'flex', 
      justifyContent: 'center',   // centers horizontally
      gap: 1, 
      flexWrap: 'wrap' }}>
        <Card sx={{ bgcolor:'#14B8A6', color:'#fff', px:2, py:1, minWidth:130 }}>
          <Typography sx={{ fontWeight:700, lineHeight:1 }}>
            €{(+KPIs.avgRent).toLocaleString()}
          </Typography>
          <Typography sx={{ fontSize:11, opacity:.9 }}>Avg. Total Rent</Typography>
        </Card>
        <Card sx={{ bgcolor:'#EF4444', color:'#fff', px:2, py:1, minWidth:130 }}>
          <Typography sx={{ fontWeight:700, lineHeight:1 }}>
            €{KPIs.avgPpsm}
          </Typography>
          <Typography sx={{ fontSize:11, opacity:.9 }}>Price per m²</Typography>
        </Card>
        <Card sx={{ bgcolor:'#F59E0B', color:'#fff', px:2, py:1, minWidth:110 }}>
          <Typography sx={{ fontWeight:700, lineHeight:1 }}>
            {KPIs.avgSqm}m²
          </Typography>
          <Typography sx={{ fontSize:11, opacity:.9 }}>Avg. Living Space</Typography>
        </Card>
      </Box>
    )}

    {/* Navigation tabs */}
    <Box sx={{ ml:'auto', display:'flex', gap:2, color:'#fff', fontWeight:600, cursor:'pointer' }}>
      <Typography
        sx={{ textDecoration: tab===0?'underline':'none' }}
        onClick={()=>setTab(0)}
      >
        DASHBOARD
      </Typography>
      <Typography
        sx={{ textDecoration: tab===1?'underline':'none' }}
        onClick={()=>setTab(1)}
      >
        PREDICTION
      </Typography>
    </Box>
  </Toolbar>
</AppBar>



      <Container maxWidth={false} disableGutters sx={{ px: 2, py: 2 }}>
        {tab === 0 ? (
          <>
            {/* Filter bar */}
            <Paper sx={{ p: 1.25, mb: 1.25, display:'flex', gap:1.25, flexWrap:'wrap', alignItems:'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight:700, mr:1 }}>Dashboard Filter</Typography>

              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel id="region-label">Region</InputLabel>
                <Select
                  labelId="region-label" multiple value={selectedStates}
                  onChange={onRegionChange} input={<OutlinedInput label="Region" />}
                  renderValue={(selected) => {
                    if (selected.includes('All')) return 'All Regions';
                    if (selected.length === 0) return 'No Region Selected';
                    return (
                      <Box sx={{ display:'flex', flexWrap:'wrap', gap:.5 }}>
                        {selected.map(v=>(
                          <Chip key={v} label={cleanRegionName(v)} onDelete={()=>delState(v)} size="small" sx={{ height:22 }}/>
                        ))}
                      </Box>
                    );
                  }}
                  MenuProps={MenuProps}
                >
                  <MenuItem value="All"><Checkbox checked={selectedStates.includes('All')} />All</MenuItem>
                  {allStates.map(s=>(
                    <MenuItem key={s} value={s} disabled={selectedStates.includes('All')}>
                      <Checkbox checked={!selectedStates.includes('All') && selectedStates.includes(s)} />
                      {cleanRegionName(s)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>


            </Paper>

            {/* Charts */}
            <Grid container spacing={1} sx={{ width:'100%', m:0 }}>
              {/* Row 1 */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height:'100%' }}>
                  <CardContent sx={{ p: 1.25 }}>
                    <Typography variant="h6" sx={{ fontSize: CHART.axisFs.title, fontWeight: 700, mb: .5 }}>
                      Average Price per m² by State
                    </Typography>
                    <Box sx={{ height: H, overflow: 'visible' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dStatePpsm} margin={CHART.margin} barCategoryGap={CHART.barGap}>
                          <CartesianGrid strokeDasharray={CHART.grid.dash} stroke={CHART.grid.stroke}/>
                          <XAxis
                            dataKey="state" interval={0} angle={-45} textAnchor="end"
                            height={88} tickMargin={12} tick={{ fontSize: CHART.axisFs.tick }}
                            label={{ value:'Region', position:'bottom', offset: 12, fontSize:CHART.axisFs.label }}
                          />
                          <YAxis
                            tickFormatter={v=>`€${v}/m²`} tick={{ fontSize: CHART.axisFs.tick }}
                           label={{
  value: 'Avg. Price per m²',
  angle: -90,
  position: 'insideLeft',
  style: { fontSize: CHART.axisFs.label },
  dy: 50,
  dx: -10   // adjust this number to move it down toward the X-axis
}}
                          />
                          <Tooltip formatter={(v)=>[`€${v}/m²`,'Price per m²']} />
                          <Bar dataKey="avgPricePerSqm" fill={FEATURE_COLORS.primary} barSize={CHART.barSize} radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height:'100%' }}>
                  <CardContent sx={{ p: 1.25 }}>
                    <Typography variant="h6" sx={{ fontSize: CHART.axisFs.title, fontWeight: 700, mb: .5 }}>
                      Total Rent Breakdown by Region
                    </Typography>
                    <Box sx={{ height: H, overflow: 'visible' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dAfford} margin={CHART.margin} barCategoryGap={CHART.barGap}>
                          <CartesianGrid strokeDasharray={CHART.grid.dash} stroke={CHART.grid.stroke}/>
                          <XAxis
                            dataKey="region" interval={0} angle={-45} textAnchor="end"
                            height={88} tickMargin={12} tick={{ fontSize: CHART.axisFs.tick }}
                            label={{ value:'Region', position:'bottom', offset: 12, fontSize:CHART.axisFs.label }}
                          />

                         
                          <YAxis
                            tickFormatter={v=>`€${v}`} tick={{ fontSize: CHART.axisFs.tick }}
                             label={{ value: 'Total Rent', angle: -90, position: 'insideLeft', style: { fontSize: CHART.axisFs.label },dy: 40}}
                          />
                          <Tooltip formatter={(v,n)=>[`€${parseFloat(v).toFixed(2)}`, n]} />
                          <Legend verticalAlign="top" wrapperStyle={{ fontSize: CHART.axisFs.tick }} />
                          <Bar dataKey="avgBaseRent" stackId="t" fill={FEATURE_COLORS.primary} name="Base Rent" barSize={CHART.barSize}/>
                          <Bar dataKey="avgServiceCharge" stackId="t" fill={FEATURE_COLORS.secondary} name="Service Charge" barSize={CHART.barSize}/>
                          <Bar dataKey="avgHeatingCosts" stackId="t" fill={FEATURE_COLORS.tertiary} name="Heating Costs" barSize={CHART.barSize} radius={[2,2,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height:'100%' }}>
                  <CardContent sx={{ p: 1.25 }}>
                    <Typography variant="h6" sx={{ fontSize: CHART.axisFs.title, fontWeight: 700, mb: .5 }}>
                      Property Condition Distribution
                    </Typography>
                    <Box sx={{ height: H }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dCondition}
                            cx="50%"
                            cy="50%"
                            innerRadius="58%"
                            outerRadius="82%"
                            dataKey="value"
                            stroke="#fff"
                            strokeWidth={2}
                            labelLine={false}
                            label={renderDonutPercent}   // ⬅️ percent in the middle
                          >
                            {dCondition.map((e,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
                          </Pie>
                          <Tooltip formatter={(v, n)=>[v, capitalize(n)]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Row 2 (aligned baselines) */}
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height:'100%' }}>
                  <CardContent sx={{ p: 1.25 }}>
                    <Typography variant="h6" sx={{ fontSize: CHART.axisFs.title, fontWeight: 700, mb: .5 }}>
                      Effect of Property Features on Rent
                    </Typography>
                    <Box sx={{ height: H }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dFeatureImpact} margin={ROW2_MARGIN} barCategoryGap={CHART.barGap}>
                          <CartesianGrid strokeDasharray={CHART.grid.dash} stroke={CHART.grid.stroke}/>
                          <XAxis
                            dataKey="feature"
                            height={ROW2_XAXIS_HEIGHT}
                            tickMargin={8}
                            tick={{ fontSize: CHART.axisFs.tick }}
                            label={{ value:'Feature', position:'bottom', offset: 12, fontSize:CHART.axisFs.label }}
                          />
                          <YAxis tickFormatter={v=>`€${v}`} tick={{ fontSize: CHART.axisFs.tick }}
                          label={{value: 'Average Rent',angle: -90,position: 'insideLeft',style: { fontSize: CHART.axisFs.label },dy: 40,}}
                          />
                          <Tooltip formatter={(v,n)=>[`€${v}`, n]} />
                          <Legend verticalAlign="top" wrapperStyle={{ fontSize: CHART.axisFs.tick }} />
                          <Bar dataKey="Yes" fill={FEATURE_COLORS.positive} barSize={CHART.barSize} radius={[2,2,0,0]} />
                          <Bar dataKey="No"  fill={FEATURE_COLORS.negative} barSize={CHART.barSize} radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height:'100%' }}>
                  <CardContent sx={{ p: 1.25 }}>
                    <Typography variant="h6" sx={{ fontSize: CHART.axisFs.title, fontWeight: 700, mb: .5 }}>
                      Construction Year Distribution Over Time
                    </Typography>
                    <Box sx={{ height: H }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dYearArea} margin={ROW2_MARGIN}>
                          <CartesianGrid strokeDasharray={CHART.grid.dash} stroke={CHART.grid.stroke}/>
                          <XAxis
                            dataKey="year"
                            ticks={yearTicks}                 // ⬅️ every 20 years
                            height={ROW2_XAXIS_HEIGHT}
                            tickMargin={8}
                            tick={{ fontSize: CHART.axisFs.tick }}
                            label={{ value:'Construction Year', position:'bottom', offset: 12, fontSize:CHART.axisFs.label }}
                          />
                          <YAxis tick={{ fontSize: CHART.axisFs.tick }}
                          label={{value: 'Property Count',angle: -90,position: 'insideLeft',style: { fontSize: CHART.axisFs.label },dy: 40,}}
                           />
                          <Tooltip formatter={(v)=>[`${v} properties`, 'Count']} />
                          <Area type="monotone" dataKey="count" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.6}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ height:'100%' }}>
                  <CardContent sx={{ p: 1.25 }}>
                    <Typography variant="h6" sx={{ fontSize: CHART.axisFs.title, fontWeight: 700, mb: .5 }}>
                      Average Rent by Construction Year
                    </Typography>
                    <Box sx={{ height: H }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dRentByDecade} margin={ROW2_MARGIN}>
                          <CartesianGrid strokeDasharray={CHART.grid.dash} stroke={CHART.grid.stroke}/>
                          <XAxis
                            dataKey="decade"
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={ROW2_XAXIS_HEIGHT}
                            tickMargin={8}
                            tick={{ fontSize: CHART.axisFs.tick }}
                            label={{ value:'Construction Decade', position:'bottom', offset: 12, fontSize:CHART.axisFs.label }}
                          />
                          <YAxis tickFormatter={v=>`€${v}`} tick={{ fontSize: CHART.axisFs.tick }}
                          label={{value: 'Average Rent',angle: -90,position: 'insideLeft',style: { fontSize: CHART.axisFs.label },dy: 40,}}
                           />
                          <Tooltip formatter={(v)=>[`€${v}`, 'Average Rent']} />
                          <Line type="monotone" dataKey="avgRent" stroke={FEATURE_COLORS.secondary} strokeWidth={3}
                                dot={{ fill: FEATURE_COLORS.secondary, r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          <PredictionTab data={data} />
        )}
      </Container>
    </Box>
  );
}
