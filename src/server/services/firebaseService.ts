import { db } from '../../lib/firebaseconfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { CertCategorizationResult } from '../models/certCategorization';
import { LLMCategorizationResult } from '../models/llmCategorization';

export const saveCategorizationResult = async (result: CertCategorizationResult | LLMCategorizationResult) => {
  const categorizationsRef = collection(db, "categorizations");
  const docRef = await addDoc(categorizationsRef, {
    ...result,
    timestamp: Timestamp.now()
  });
  return docRef.id;
}; 