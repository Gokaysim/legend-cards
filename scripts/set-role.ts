// Sets a user's role: npm run set-role -- --email <email> --role dm|player [--project <id>] [--yes]
// Targets the local emulators unless --project names a real project (which must then be confirmed).
import { parseArgs } from 'node:util'

import { messages } from './lib/messages.ts'
import { ROLES, setRoleByEmail } from './lib/setRole.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'

async function main(): Promise<number> {
  let values: { email?: string; role?: string; project?: string; yes?: boolean }
  try {
    values = parseArgs({
      options: { email: { type: 'string' }, role: { type: 'string' }, ...TARGET_OPTIONS },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(error instanceof Error ? error.message : String(error)))
    console.error(messages.usageSetRole)
    return 1
  }

  const { email, role } = values
  if (!email || !role) {
    console.error(messages.usageSetRole)
    return 1
  }
  // Checked before connecting, so an invalid role never asks for confirmation.
  if (!(ROLES as readonly string[]).includes(role)) {
    console.error(messages.invalidRole(role, ROLES))
    return 1
  }

  const connection = await connect(values)
  if (!connection.ok) {
    console.error(connection.message)
    return 1
  }

  const { admin } = connection
  try {
    const result = await setRoleByEmail(admin, email, role)
    switch (result.kind) {
      case 'updated':
        console.log(messages.roleUpdated(result.name, result.from, result.to))
        return 0
      case 'unchanged':
        console.log(messages.roleUnchanged(result.name, result.role))
        return 0
      case 'no-such-user':
        console.error(messages.noSuchUser(result.email))
        return 1
      case 'no-profile':
        console.error(messages.noProfile(result.email))
        return 1
      case 'invalid-role':
        console.error(messages.invalidRole(result.role, ROLES))
        return 1
    }
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()
