export type AccountProfile = {
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

export function accountName(account: AccountProfile) {
  return [account.firstName, account.lastName].filter(Boolean).join(" ");
}
