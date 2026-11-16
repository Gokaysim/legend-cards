// Puts an email address on the access list: npm run allow-email -- --email <email> [--project <id>] [--yes]
// Targets the local emulators unless --project names a real project (which must then be confirmed).
import { parseArgs } from 'node:util'

import { allowEmail, isValidEmail, normalizeEmail } from './lib/allowEmail.ts'
import { messages } from './lib/messages.ts'
import { connect, TARGET_OPTIONS } from './lib/target.ts'

async function main(): Promise<number> {
  let values: { email?: string; project?: string; yes?: boolean }
  try {
    values = parseArgs({
      options: { email: { type: 'string' }, ...TARGET_OPTIONS },
      strict: true,
      allowPositionals: false,
    }).values
  } catch (error) {
    console.error(messages.invalidArguments(error instanceof Error ? error.message : String(error)))
    console.error(messages.usageAllowEmail)
    return 1
  }

  const { email } = values
  if (!email) {
    console.error(messages.usageAllowEmail)
    return 1
  }
  // Checked before connecting, so a malformed address never asks for confirmation.
  if (!isValidEmail(normalizeEmail(email))) {
    console.error(messages.invalidEmail(email))
    return 1
  }

  const connection = await connect(values)
  if (!connection.ok) {
    console.error(connection.message)
    return 1
  }

  const { admin } = connection
  try {
    const result = await allowEmail(admin, email)
    switch (result.kind) {
      case 'added':
        console.log(messages.emailAllowed(result.email))
        return 0
      case 'unchanged':
        console.log(messages.emailAlreadyAllowed(result.email))
        return 0
      case 'invalid':
        console.error(messages.invalidEmail(email))
        return 1
    }
  } finally {
    await admin.close()
  }
}

process.exitCode = await main()
