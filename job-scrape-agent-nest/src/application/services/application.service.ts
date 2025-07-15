import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createApplicationDto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: createApplicationDto,
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'applied_at',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          job: true,
        },
      }),
      this.prisma.application.count(),
    ]);

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
      },
    });
  }

  async update(id: number, updateApplicationDto: UpdateApplicationDto) {
    return this.prisma.application.update({
      where: { id },
      data: {
        ...updateApplicationDto,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.application.delete({
      where: { id },
    });
  }
}
