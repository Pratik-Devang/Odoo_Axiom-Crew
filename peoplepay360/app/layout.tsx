import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'PeoplePay360 | HR & Payroll',description:'Employees, attendance, leave and payroll in one connected workspace.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>}
