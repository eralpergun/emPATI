
import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  // Şifrelerin arayüzde görünebilmesi için artık hashlemeden düz metin olarak kaydediyoruz.
  return password;
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  // Eğer veritabanındaki şifre daha önceden bcrypt ile hashlenmişse (genellikle $2b$ ile başlar)
  if (hash.startsWith('$2b$')) {
    return bcrypt.compare(password, hash);
  }
  // Değilse düz metin olarak karşılaştır
  return password === hash;
};
