import React from 'react';

interface AssistantsListProps {
  assistants: Record<string, string>;
}

export function AssistantsList({ assistants }: AssistantsListProps) {
  const entries = Object.entries(assistants);
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-base font-semibold">OpenAI / Asistentes configurados</h4>
      <ul className="list-disc list-inside">
        {entries.map(([name, id]) => (
          <li key={id} className="text-sm">
            <strong>Nombre: </strong> {name} / <strong>Id: </strong> {id}
          </li>
        ))}
      </ul>
    </div>
  );
}
