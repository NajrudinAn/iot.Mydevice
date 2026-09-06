import re

with open('frontend/src/pages/WorkspaceDataDeviceView.jsx', 'r') as f:
    content = f.read()

# Replace the Recent Received Data row mapping
recent_pattern = r"\{recentRecords\.map\(\(record, index\) => \{.*?(?=\}\)}\)"
# We will just manually replace the entire block inside recentRecords.map and historyRecords.map

def get_row_jsx(is_history=False):
    return """{
                              const subset = getFilteredPayload(record.payload, sourceId);
                              const subsetArray = getCompactPreview(record.payload, sourceId);
                              const displayKeys = subsetArray.slice(0, 5);
                              
                              let displaySource = sourceId !== 'All' ? sourceId : 'mixed';
                              if (sourceId === 'All' && record.payload) {
                                  const sources = new Set();
                                  Object.keys(record.payload).forEach(k => {
                                      const possibleField = dataFields.find(f => f.field_name === k || f.field_name.startsWith(k + '.'));
                                      if (possibleField) sources.add(possibleField.source);
                                  });
                                  if (sources.size > 0) displaySource = Array.from(sources).join(' • ');
                              }

                              return (
                                  <div key={record.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors ${index !== """ + ("historyRecords" if is_history else "recentRecords") + """.length -1 ? 'border-b border-gray-100' : ''}`}>
                                      {/* Timestamp */}
                                      <div className="shrink-0 w-24">
                                          <div className="font-medium text-main text-sm">
                                              {new Date(record.recorded_at).toLocaleTimeString()}
                                          </div>
                                          <div className="text-muted text-[10px] mt-0.5">{new Date(record.recorded_at).toLocaleDateString()}</div>
                                      </div>
                                      
                                      {/* Source & Field Count */}
                                      <div className="shrink-0 w-32 border-l border-gray-100 pl-4 hidden sm:block">
                                          <div className="text-sm font-semibold capitalize text-blue truncate" title={displaySource}>{displaySource}</div>
                                          <div className="text-xs text-muted">{subsetArray.length} field{subsetArray.length !== 1 ? 's' : ''}</div>
                                      </div>
                                      
                                      {/* Compact Preview */}
                                      <div className="flex-1 flex items-center gap-2 overflow-hidden whitespace-nowrap min-w-0 pr-2" title={JSON.stringify(subset, null, 2)}>
                                          {displayKeys.map(item => {
                                              let valStr = String(item.value);
                                              if (typeof item.value === 'object') valStr = '{...}';
                                              return (
                                                  <span key={item.key} className="inline-flex items-center text-xs text-slate-600 truncate bg-white px-2 py-1 border border-slate-200 shadow-sm rounded">
                                                      <span className="opacity-60 mr-1">{item.key}:</span>
                                                      <span className="font-semibold truncate max-w-[120px]">{valStr}</span>
                                                  </span>
                                              );
                                          })}
                                          {subsetArray.length > 5 && (
                                              <span className="text-xs text-muted font-medium shrink-0">+{subsetArray.length - 5} more</span>
                                          )}
                                          {subsetArray.length === 0 && (
                                              <span className="text-xs text-muted italic">No matching fields</span>
                                          )}
                                      </div>
                                      
                                      {/* Action */}
                                      <div className="shrink-0">
                                          <Button variant="outline" size="sm" onClick={() => openModal(record)}>
                                              View JSON
                                          </Button>
                                      </div>
                                  </div>
                              );
                          }"""

# Since regex on multi-line JSX is tricky, let's just write a script to generate the whole file again with the new row design.
# I'll just rewrite the file content generator.
