import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        // 1. Gelen veriyi doğrula
        if (!name || !email || !password) {
            return new NextResponse(JSON.stringify({ error: "Eksik bilgi" }), { status: 400 });
        }

        // 2. Bu email ile zaten bir kullanıcı var mı diye kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { email: email }
        });

        if (existingUser) {
            return new NextResponse(JSON.stringify({ error: "Bu email adresi zaten kullanılıyor" }), { status: 409 }); // 409: Conflict
        }

        // 3. Şifreyi güvenli bir şekilde hash'le
        const hashedPassword = await hash(password, 10);

        // 4. Yeni kullanıcıyı veritabanına kaydet
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
                // plan ve role alanları şemadaki @default değerlerini alacak
            }
        });
// 2️⃣ Otomatik organization yarat ve user'ı bağla
        const org = await prisma.organization.create({
            data: {
                name: `${name}'s Organization`,
                users: { connect: { id: newUser.id } },
            }
        });

        // 3️⃣ organizationId'yi user’a serbest bırakıp güncelle
        await prisma.user.update({
            where: { id: newUser.id },
            data: { organizationId: org.id },
        });
        // Başarılı olursa kullanıcı bilgisini geri döndür (şifre hariç)
        const { hashedPassword: _, ...userWithoutPassword } = newUser;
        return NextResponse.json(userWithoutPassword, { status: 201 }); // 201: Created

    } catch (error) {
        console.error("Kayıt hatası:", error);
        return new NextResponse(JSON.stringify({ error: "Sunucuda bir hata oluştu" }), { status: 500 });
    }
}
