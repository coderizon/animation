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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 12,
          padding: 40,
          maxWidth: 900,
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 8,
          }}>
            Template auswählen
          </h2>
          <p style={{
            fontSize: 14,
            color: '#888',
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
                  backgroundColor: isSelected ? '#2196F3' : '#252538',
                  border: isSelected ? '3px solid #2196F3' : '2px solid #2a2a3e',
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
                    ? '0 8px 24px rgba(33, 150, 243, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#2a2a3e';
                    e.currentTarget.style.borderColor = '#4a4a6e';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#252538';
                    e.currentTarget.style.borderColor = '#2a2a3e';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                  }
                }}
              >
                {/* Icon Circle Background */}
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  fontWeight: 700,
                  color: isSelected ? '#fff' : '#888',
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
                  color: isSelected ? '#fff' : '#ddd',
                  textAlign: 'center',
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}>
                  {template.name}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: 13,
                  color: isSelected ? 'rgba(255, 255, 255, 0.9)' : '#888',
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
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(33, 150, 243, 0.1)',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    color: isSelected ? '#fff' : '#2196F3',
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
                    backgroundColor: '#fff',
                    color: '#2196F3',
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
              color: '#888',
              border: '1px solid #2a2a3e',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#252538';
              e.currentTarget.style.color = '#ddd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#888';
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleLoadTemplate}
            disabled={!selectedTemplate}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedTemplate ? '#2196F3' : '#2a2a3e',
              color: selectedTemplate ? '#fff' : '#666',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: selectedTemplate ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (selectedTemplate) {
                e.currentTarget.style.backgroundColor = '#1976D2';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplate) {
                e.currentTarget.style.backgroundColor = '#2196F3';
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
