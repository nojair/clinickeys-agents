// /features/bot-configs/ui/WebhookCopyTooltip.tsx

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { formatWebhookUrl } from '@/app/features/bot-configs/lib/formatWebhookUrl';
import type { BotConfig } from '@/app/entities/bot-config/types';
import { toast } from 'sonner';

interface WebhookCopyTooltipProps {
  config: BotConfig;
}

export function WebhookCopyTooltip({ config }: WebhookCopyTooltipProps) {
  const [show, setShow] = useState(false);
  // Se debe usar la variable de entorno definida para la base de webhooks
  const baseUrl = process.env.NEXT_PUBLIC_LAMBDA_WEBHOOK_BASE_URL || '';
  const webhookUrl = formatWebhookUrl({
    baseUrl,
    botConfigType: config.botConfigType,
    botConfigId: config.id,
    clinicSource: config.clinicSource,
    clinicId: config.clinicId,
    salesbotId: config.kommoSalesbotId,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook copiado al portapapeles');
    setShow(true);
    setTimeout(() => setShow(false), 1500);
  };

  return (
    <div className="relative inline-flex items-center group">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar Webhook"
        className="p-1 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
      >
        <Copy size={18} />
      </button>
      <div className="absolute left-0 z-20 w-max min-w-[18rem] max-w-xs bg-white border border-gray-200 shadow-xl rounded-xl px-4 py-2 text-xs text-gray-800 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-all duration-200 top-8">
        <span className="font-mono break-all select-all">{webhookUrl}</span>
      </div>
      {show && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-green-500 text-white px-2 py-1 rounded-xl text-xs shadow">
          Copiado
        </span>
      )}
    </div>
  );
}
