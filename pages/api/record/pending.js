import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  try {
    const pendingRequests = await prisma.recordRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' } // 오래된 요청부터 적용
    });
    res.status(200).json(pendingRequests);
  } catch (error) {
    res.status(500).json([]);
  }
}