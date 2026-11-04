import 'dotenv/config';
import {connectDB} from '../config/db.js';
import {deliverNext} from '../services/mail.service.js';
await connectDB();
if(!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) throw new Error('Configure RESEND_API_KEY and MAIL_FROM');
while(true){try{await deliverNext();}catch{console.error('Mail worker failed; retrying');}await new Promise(r=>setTimeout(r,1000));}
