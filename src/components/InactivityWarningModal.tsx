import { Modal, Box, Typography, Button } from '@mui/material';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface InactivityWarningModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  remainingTime: number;
}

export default function InactivityWarningModal({
  open,
  onClose,
  onContinue,
  remainingTime
}: InactivityWarningModalProps) {
  const router = useRouter();
  
  // Converter o tempo restante para minutos e segundos
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);

  const handleTimeout = useCallback(async () => {
    // Primeiro fecha o modal
    onClose();
    // Pequeno delay para garantir que o modal feche
    await new Promise(resolve => setTimeout(resolve, 300));
    // Depois redireciona
    router.push('/inactivity-logout');
  }, [onClose, router]);

  useEffect(() => {
    // Se o modal estiver aberto e o tempo acabou, inicia o processo de timeout
    if (open && (remainingTime <= 0 || (minutes <= 0 && seconds <= 0))) {
      handleTimeout();
    }
  }, [remainingTime, minutes, seconds, open, handleTimeout]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="inactivity-warning-modal"
      aria-describedby="inactivity-warning-description"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2,
      }}>
        <Typography id="inactivity-warning-modal" variant="h6" component="h2" color="error" gutterBottom>
          Aviso de Inatividade
        </Typography>
        <Typography id="inactivity-warning-description" sx={{ mt: 2 }}>
          Sua sessão será encerrada em {minutes} minutos e {seconds} segundos devido à inatividade.
          Deseja continuar conectado?
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} color="error" variant="outlined">
            Sair
          </Button>
          <Button onClick={onContinue} color="primary" variant="contained" autoFocus>
            Continuar Conectado
          </Button>
        </Box>
      </Box>
    </Modal>
  );
} 