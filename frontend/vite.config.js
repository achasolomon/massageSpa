import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      '5173-iaf30qaqg19pj42dkszg8-1d761533.manusvm.computer'
      // Add localhost if needed for local testing via browser tool
      // 'localhost',
      // '127.0.0.1'
      
    ]
  },
   define: {
    'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify('pk_test_51RTViaDG77DJOPct9qgZ1WXf19s0v9RxzgOKPygD0zWoqxaXQMvetMoB7aPf6ptQ5mONMTA7MFS53p0cLylhWtgQ00mnylbOWv')
  }
})

