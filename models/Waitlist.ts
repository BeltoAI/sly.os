import mongoose from 'mongoose';

const WaitlistSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  audience: {
    type: String,
    required: true,
    enum: ['company', 'app'],
  },
  organization: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Waitlist || mongoose.model('Waitlist', WaitlistSchema);
