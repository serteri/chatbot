import {prisma} from '@/lib/prisma.ts';

async function test() {
    const users = await prisma.user.findMany();
    console.log(users);
    await prisma.$disconnect();
}

test();