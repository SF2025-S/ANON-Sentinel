"use client"

import { useRouter } from 'next/navigation';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';

export default function InactivityLogout() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5'
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
          p: 3,
          boxShadow: 3
        }}
      >
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom color="error">
            Sessão Expirada
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Você foi desconectado devido a inatividade. Por favor, faça login novamente para continuar.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            fullWidth
          >
            Fazer Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
} 