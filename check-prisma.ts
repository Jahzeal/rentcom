
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if ('phoneNumberVerification' in prisma) {
    console.log('phoneNumberVerification exists on PrismaClient instance');
} else {
    console.log('phoneNumberVerification DOES NOT exist on PrismaClient instance');
}

// Check for PascalCase just in case
if ('PhoneNumberVerification' in prisma) {
    console.log('PhoneNumberVerification exists on PrismaClient instance');
} else {
    console.log('PhoneNumberVerification DOES NOT exist on PrismaClient instance');
}
