// /features/bot-configs/ui/BotConfigFormStepType.tsx

import { Button } from '@/app/shared/ui/Button';
import { useState } from 'react';
import type { BotConfigType } from '@/app/entities/bot-config/types';

interface BotConfigFormStepTypeProps {
  value?: BotConfigType;
  onChange: (type: BotConfigType) => void;
}

export function BotConfigFormStepType({ value, onChange }: BotConfigFormStepTypeProps) {
  const [selected, setSelected] = useState<BotConfigType | undefined>(value);

  const handleSelect = (type: BotConfigType) => {
    setSelected(type);
    onChange(type);
  };

  return (
    <div className="flex flex-col items-center gap-8 p-6">
      <h2 className="text-lg font-semibold">Selecciona el tipo de Bot a configurar</h2>
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        <Button
          type="button"
          variant={selected === 'notificationBot' ? 'primary' : 'secondary'}
          className="w-full"
          onClick={() => handleSelect('notificationBot')}
        >
          Notification Bot
        </Button>
        <Button
          type="button"
          variant={selected === 'chatBot' ? 'primary' : 'secondary'}
          className="w-full"
          onClick={() => handleSelect('chatBot')}
        >
          Chat Bot
        </Button>
      </div>
      <div className="text-sm text-muted-foreground pt-6">
        <ul className="list-disc pl-5 text-left">
          <li><b>Notification Bot:</b> Envía notificaciones automáticas integradas con Kommo.</li>
          <li><b>Chat Bot:</b> Automatiza conversaciones, integra OpenAI y permite placeholders personalizables.</li>
        </ul>
      </div>
    </div>
  );
}
