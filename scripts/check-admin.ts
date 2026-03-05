import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdmin() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@smc-office.eu' }
  });
  
  if (!user) {
    console.log('Admin existiert NICHT - Erstelle...');
    const hashedPassword = await hash('soadmin146810!', 12);
    const newUser = await prisma.user.create({
      data: {
        email: 'admin@smc-office.eu',
        password: hashedPassword,
        name: 'Thomas Schwarz',
        role: 'ADMIN',
      }
    });
    console.log('Admin erstellt:', newUser.id);
  } else {
    console.log('Admin existiert:', user.id, user.email, user.role);
    const isValid = await compare('soadmin146810!', user.password || '');
    console.log('Passwort gültig:', isValid);
    
    if (!isValid) {
      console.log('Aktualisiere Passwort...');
      const hashedPassword = await hash('soadmin146810!', 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log('Passwort aktualisiert');
    }
  }
  
  await prisma.$disconnect();
}

checkAdmin().catch(console.error);
