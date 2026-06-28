import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

const admin = ac.newRole({
  ...adminAc.statements,
});

const user = ac.newRole({
  ...userAc.statements,
});

export const roles = {
  admin,
  user,
};
