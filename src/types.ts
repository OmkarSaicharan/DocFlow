export interface Share {
  id: string;
  documentId: string;
  sharedWith: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  shares?: Share[];
  isOwner?: boolean;
}
