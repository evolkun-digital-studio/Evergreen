"use server";

import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Enquiry } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";

const idSchema = z.string().refine((value) => mongoose.isValidObjectId(value), "Invalid enquiry");
const statusSchema = z.enum(["new", "contacted", "qualified", "closed"]);

export async function updateEnquiryStatusAction(id: string, status: string) {
  return runAction(async () => {
    await requireActionUser("manageLeads");
    await connectDB();
    const result = await Enquiry.updateOne({ _id: idSchema.parse(id) }, { $set: { status: statusSchema.parse(status) } });
    if (!result.matchedCount) throw new UserFacingError("This enquiry no longer exists.");
  }, "Status updated");
}

export async function addEnquiryNoteAction(id: string, text: string) {
  return runAction(async () => {
    const user = await requireActionUser("manageLeads");
    const note = z.string().trim().min(1).max(1000).parse(text);
    await connectDB();
    const result = await Enquiry.updateOne({ _id: idSchema.parse(id) }, { $push: { notes: { text: note, authorId: user.id, createdAt: new Date() } } });
    if (!result.matchedCount) throw new UserFacingError("This enquiry no longer exists.");
  }, "Note added");
}
