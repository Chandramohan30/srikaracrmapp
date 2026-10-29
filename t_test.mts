process.env.OPENWA_URL='http://127.0.0.1:8099';process.env.OPENWA_API_KEY='k1';
import { sendWhatsApp } from './src/server/whatsapp.js';
console.log(await sendWhatsApp('+918124472399','hello'));
