import React from 'react';
import { Box, Skeleton, Grid } from '@mui/material';

const LoadingSkeleton = ({ variant = "dashboard" }) => {
  return (
    <Box p={3}>
      <Grid container spacing={2}>
        {[...Array(4)].map((_, idx) => (
          // Updated Grid usage for v2
          <Grid key={idx} sx={{
            gridColumn: {
              xs: 'span 12',
              sm: 'span 6',
              md: 'span 3'
            }
          }}>
            <Skeleton variant="rectangular" height={100} animation="wave" />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LoadingSkeleton;