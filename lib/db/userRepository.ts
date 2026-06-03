export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  isAdmin: boolean;
  avatarUrl: string | null;
  color: string;
  createdAt: string;
}

export interface NewUser {
  username: string;
  displayName: string;
  passwordHash: string;
  isAdmin: boolean;
  color: string;
  avatarUrl?: string | null;
}

export interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(user: NewUser): Promise<UserRecord>;
  list(): Promise<UserRecord[]>;
}
