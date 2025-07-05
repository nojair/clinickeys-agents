// packages/functions/src/notifications.ts

import { getActiveClinics } from '@clinickeys-agents/core/config';
import { clinicNow } from '@clinickeys-agents/core/utils/date';
import { fetchForClinicOnDate } from '@clinickeys-agents/core/notifications/repository';
import processClinicBatch from '@clinickeys-agents/core/notifications/processor';
import { invokeSelf } from '@clinickeys-agents/core/utils/lambda';
import type { Handler } from 'aws-lambda';

const CLINICS_CONFIG_DB_NAME = process.env.CLINICS_CONFIG_DB_NAME!;

export const handler: Handler = async (event, context) => {
  console.log('Lambda execution start');
  const clinics = await getActiveClinics(CLINICS_CONFIG_DB_NAME);

  for (const clinic of clinics) {
    const todayLocalISO = clinicNow(clinic.timezone).toISODate();
    const pending = await fetchForClinicOnDate(
      clinic.id_clinica,
      todayLocalISO
    );

    console.log(
      `>> Clínica ${clinic.id_clinica} – ${pending.length} notificaciones para ${todayLocalISO}`
    );

    if (pending.length) {
      await processClinicBatch(clinic, pending);
    }
  }

  if (context.getRemainingTimeInMillis() < 15_000) {
    console.log('Re‑invoking Lambda asynchronously to re‑check at ≥10:00');
    await invokeSelf(event, context);
  }

  console.log('Lambda execution end');
};
