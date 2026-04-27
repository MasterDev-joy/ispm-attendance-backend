import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, startTime, endTime, field_of_study, professorId } = req.body;

    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        field_of_study,
        professorId
      }
    });

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: "Impossible de créer le cours" });
  }
};

export const getProfessorCourses = async (req: Request, res: Response) => {
  try {
    const professorId = (req as any).user.id;
    const courses = await prisma.course.findMany({
      where: { professorId },
      orderBy: { startTime: 'asc' }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des cours" });
  }
};