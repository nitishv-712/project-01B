import mongoose, { Schema, Model } from "mongoose";
import { IStats } from "../types";

const StatsSchema = new Schema<IStats>(
  {
    studentsEnrolled: String,
    videoTutorials: String,
    expertCourses: String,
    youtubeSubscribers: String,
  },
  { timestamps: true }
);

const Stats: Model<IStats> =
  mongoose.models.Stats ?? mongoose.model<IStats>("Stats", StatsSchema);

export default Stats;
