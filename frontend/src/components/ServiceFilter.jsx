export default function ServiceFilters({ categories, filters, onFilterChange }) {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Filter Services</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Search Services"
            variant="outlined"
            fullWidth
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </Grid>
        {/* Add other filter controls */}
      </Grid>
    </Paper>
  );
}