import { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { getTemplateList, loadTemplate, TemplateInfo } from '../../templates';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ isOpen, onClose }) => {
  const loadProject = useProjectStore((state) => state.loadProject);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const templates = getTemplateList();

  if (!isOpen) return null;

  const handleLoadTemplate = () => {
    if (!selectedTemplate) return;

    try {
      const project = loadTemplate(selectedTemplate);
      loadProject(project);
      onClose();
    } catch (error) {
      console.error('Failed to load template:', error);
      alert('Fehler beim Laden des Templates');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--ae-bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--ae-bg-panel)',
          borderRadius: 12,
          padding: 40,
          maxWidth: 900,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--ae-shadow-floating)',
          border: '1px solid var(--ae-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--ae-text-primary)',
            marginBottom: 8,
          }}>
            Template auswählen
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--ae-text-secondary)',
          }}>
            Starte mit einer Vorlage oder einem leeren Canvas
          </p>
        </div>

        {/* Template Gallery - Icon View */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginBottom: 40,
        }}>
          {templates.map((template: TemplateInfo) => {
            const isSelected = selectedTemplate === template.id;
            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                style={{
                  padding: 32,
                  backgroundColor: isSelected ? 'var(--ae-accent)' : 'var(--ae-bg-input)',
                  border: isSelected ? '3px solid var(--ae-accent)' : '2px solid var(--ae-border)',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  position: 'relative',
                  overflow: 'hidden',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected
                    ? '0 12px 28px rgba(86, 129, 255, 0.32)'
                    : 'var(--ae-shadow-elevated)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
                    e.currentTarget.style.borderColor = 'var(--ae-border-strong)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 14px 32px rgba(0, 0, 0, 0.38)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--ae-bg-input)';
                    e.currentTarget.style.borderColor = 'var(--ae-border)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'var(--ae-shadow-elevated)';
                  }
                }}
              >
                {/* Icon Circle Background */}
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.16)' : 'var(--ae-bg-panel-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 700,
                  color: isSelected ? 'var(--ae-gray-900)' : 'var(--ae-text-muted)',
                  letterSpacing: '-1px',
                  transition: 'all 0.3s',
                  marginBottom: 8,
                }}>
                  {template.name.charAt(0).toUpperCase()}
                </div>

                {/* Template Name */}
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: isSelected ? 'var(--ae-gray-900)' : 'var(--ae-text-primary)',
                  textAlign: 'center',
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}>
                  {template.name}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: 13,
                  color: isSelected ? 'rgba(255, 255, 255, 0.88)' : 'var(--ae-text-secondary)',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  margin: 0,
                  minHeight: 40,
                }}>
                  {template.description}
                </p>

                {/* Element Count Badge */}
                {template.data.elements.length > 0 && (
                  <div style={{
                    padding: '6px 16px',
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.18)' : 'var(--ae-accent-overlay)',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    color: isSelected ? 'var(--ae-gray-900)' : 'var(--ae-accent-strong)',
                    marginTop: 4,
                  }}>
                    {template.data.elements.length} {template.data.elements.length === 1 ? 'Element' : 'Elemente'}
                  </div>
                )}

                {/* Selected Checkmark */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'var(--ae-gray-900)',
                    color: 'var(--ae-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 'bold',
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: 'var(--ae-text-secondary)',
              border: '1px solid var(--ae-border)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ae-bg-panel-raised)';
              e.currentTarget.style.color = 'var(--ae-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--ae-text-secondary)';
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleLoadTemplate}
            disabled={!selectedTemplate}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedTemplate ? 'var(--ae-accent)' : 'var(--ae-bg-panel-raised)',
              color: selectedTemplate ? 'var(--ae-gray-900)' : 'var(--ae-text-disabled)',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: selectedTemplate ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedTemplate) {
                e.currentTarget.style.backgroundColor = 'var(--ae-accent-strong)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplate) {
                e.currentTarget.style.backgroundColor = 'var(--ae-accent)';
              }
            }}
          >
            Template laden
          </button>
        </div>
      </div>
    </div>
  );
};
