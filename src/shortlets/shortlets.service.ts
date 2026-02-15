/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    CreateShortletDto,
    UpdateShortletDto,
    CreateRoomOptionDto,
    UpdateRoomOptionDto,
} from './dto';
import { Prisma, PropertyType } from '@prisma/client';

@Injectable()
export class ShortletsService {
    constructor(private prisma: PrismaService) { }

    // Public Methods
    async getShortletById(id: string) {
        const shortlet = await this.prisma.shortlet.findUnique({
            where: { id },
            include: {
                property: {
                    include: {
                        amenities: true,
                    },
                },
                roomOptions: true,
            },
        });

        if (!shortlet) {
            throw new NotFoundException('Shortlet not found');
        }

        // Transform to match frontend expected format
        return this.transformShortletResponse(shortlet);
    }

    async getShortletByPropertyId(propertyId: string) {
        const shortlet = await this.prisma.shortlet.findUnique({
            where: { propertyId },
            include: {
                property: {
                    include: {
                        amenities: true,
                    },
                },
                roomOptions: true,
            },
        });

        if (!shortlet) {
            throw new NotFoundException('Shortlet not found for this property');
        }

        return this.transformShortletResponse(shortlet);
    }

    private transformShortletResponse(shortlet: any) {
        return {
            id: shortlet.id,
            propertyId: shortlet.propertyId,
            title: shortlet.property.title,
            description: shortlet.property.description,
            location: shortlet.property.location,
            address: shortlet.property.address,
            images: shortlet.property.images,
            coords: shortlet.property.coords,
            offers: shortlet.property.offers,
            amenities: shortlet.property.amenities.map((a: any) => a.name),
            roomOptions: shortlet.roomOptions.map((ro: any) => ({
                id: ro.id,
                name: ro.name,
                beds: ro.beds,
                price: ro.price,
                description: ro.description,
                amenities: ro.amenities,
                images: ro.images,
            })),
            createdAt: shortlet.createdAt,
            updatedAt: shortlet.updatedAt,
        };
    }

    async getAllShortlets(page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [shortlets, total] = await Promise.all([
            this.prisma.shortlet.findMany({
                skip,
                take: limit,
                include: {
                    property: {
                        include: {
                            amenities: true,
                        },
                    },
                    roomOptions: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.shortlet.count(),
        ]);

        return {
            data: shortlets.map((shortlet) => ({
                id: shortlet.id,
                title: shortlet.property.title,
                description: shortlet.property.description,
                location: shortlet.property.location,
                address: shortlet.property.address,
                images: shortlet.property.images,
                coords: shortlet.property.coords,
                offers: shortlet.property.offers,
                amenities: shortlet.property.amenities.map((a) => a.name),
                roomOptions: shortlet.roomOptions.map((ro) => ({
                    id: ro.id,
                    name: ro.name,
                    beds: ro.beds,
                    price: ro.price,
                    description: ro.description,
                    amenities: ro.amenities,
                    images: ro.images,
                })),
                createdAt: shortlet.createdAt,
                updatedAt: shortlet.updatedAt,
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Admin Methods
    async createShortlet(dto: CreateShortletDto) {
        return this.prisma.$transaction(async (tx) => {
            // Create the property first
            const property = await tx.property.create({
                data: {
                    title: dto.title,
                    description: dto.description,
                    type: PropertyType.ShortLET,
                    address: dto.address,
                    location: dto.location,
                    coords: dto.coords as Prisma.InputJsonValue,
                    images: dto.images,
                    offers: dto.offers || '',
                    price: [] as Prisma.InputJsonValue, // Empty for shortlets
                    beds: 0, // Will be in room options
                    baths: 0, // Can be added later if needed
                    typerooms: 'Shortlet',
                    amenities: dto.amenities?.length
                        ? {
                            connectOrCreate: dto.amenities.map((name) => ({
                                where: { name },
                                create: { name },
                            })),
                        }
                        : undefined,
                },
            });

            // Create the shortlet with room options
            const shortlet = await tx.shortlet.create({
                data: {
                    propertyId: property.id,
                    roomOptions: {
                        create: dto.roomOptions.map((ro) => ({
                            name: ro.name,
                            beds: ro.beds,
                            price: ro.price,
                            description: ro.description,
                            amenities: ro.amenities,
                            images: ro.images,
                        })),
                    },
                },
                include: {
                    property: {
                        include: {
                            amenities: true,
                        },
                    },
                    roomOptions: true,
                },
            });

            return shortlet;
        });
    }

    async updateShortlet(id: string, dto: UpdateShortletDto) {
        const shortlet = await this.prisma.shortlet.findUnique({
            where: { id },
            include: { property: true },
        });

        if (!shortlet) {
            throw new NotFoundException('Shortlet not found');
        }

        const propertyData: Prisma.PropertyUpdateInput = {};
        if (dto.title) propertyData.title = dto.title;
        if (dto.description !== undefined)
            propertyData.description = dto.description;
        if (dto.address) propertyData.address = dto.address;
        if (dto.location) propertyData.location = dto.location;
        if (dto.coords) propertyData.coords = dto.coords as Prisma.InputJsonValue;
        if (dto.images) propertyData.images = dto.images;
        if (dto.offers !== undefined) propertyData.offers = dto.offers;
        if (dto.amenities?.length) {
            propertyData.amenities = {
                connectOrCreate: dto.amenities.map((name) => ({
                    where: { name },
                    create: { name },
                })),
            };
        }

        await this.prisma.property.update({
            where: { id: shortlet.propertyId },
            data: propertyData,
        });

        return this.getShortletById(id);
    }

    async addRoomOption(shortletId: string, dto: CreateRoomOptionDto) {
        const shortlet = await this.prisma.shortlet.findUnique({
            where: { id: shortletId },
        });

        if (!shortlet) {
            throw new NotFoundException('Shortlet not found');
        }

        return this.prisma.roomOption.create({
            data: {
                shortletId,
                name: dto.name,
                beds: dto.beds,
                price: dto.price,
                description: dto.description,
                amenities: dto.amenities,
                images: dto.images,
            },
        });
    }

    async updateRoomOption(
        shortletId: string,
        roomId: string,
        dto: UpdateRoomOptionDto,
    ) {
        const roomOption = await this.prisma.roomOption.findFirst({
            where: {
                id: roomId,
                shortletId,
            },
        });

        if (!roomOption) {
            throw new NotFoundException('Room option not found');
        }

        return this.prisma.roomOption.update({
            where: { id: roomId },
            data: {
                ...dto,
            },
        });
    }

    async deleteRoomOption(shortletId: string, roomId: string) {
        const roomOption = await this.prisma.roomOption.findFirst({
            where: {
                id: roomId,
                shortletId,
            },
        });

        if (!roomOption) {
            throw new NotFoundException('Room option not found');
        }

        await this.prisma.roomOption.delete({
            where: { id: roomId },
        });

        return { message: 'Room option deleted successfully' };
    }

    async deleteShortlet(id: string) {
        const shortlet = await this.prisma.shortlet.findUnique({
            where: { id },
            include: { property: true },
        });

        if (!shortlet) {
            throw new NotFoundException('Shortlet not found');
        }

        // Delete property (cascades to shortlet and room options)
        await this.prisma.property.delete({
            where: { id: shortlet.propertyId },
        });

        return { message: 'Shortlet deleted successfully' };
    }
}
