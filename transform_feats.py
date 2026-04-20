import json
import re

# Read the 2024 feats file
with open('public/data/2024/feats.json', 'r') as f:
    data = json.load(f)

# Transform each feat
for feat in data:
    # Create index from name: lowercase, replace spaces with hyphens
    original_name = feat.get('name', '')
    # Convert underscores to spaces for proper title casing
    name_for_title = original_name.replace('_', ' ')
    index = name_for_title.lower().replace(' ', '-')
    feat['index'] = index
    
    # Format name with proper capitalization (title case)
    feat['name'] = name_for_title.title()
    
    # Convert description to desc array format if needed
    if 'description' in feat and 'desc' not in feat:
        desc_text = feat['description']
        # Parse HTML paragraphs into array items, converting to <br/> format
        paragraphs = re.findall(r'<p>(.*?)</p>', desc_text)
        if paragraphs:
            # Join paragraphs with <br/><br/> for proper spacing
            feat['desc'] = '<br/><br/>'.join(paragraphs)
        else:
            feat['desc'] = desc_text
    elif 'description' in feat and 'desc' in feat:
        # Update desc if description exists but desc is empty or single item
        if isinstance(feat.get('desc'), str):
            feat['desc'] = feat['desc']

# Write the transformed data back
with open('public/data/2024/feats.json', 'w') as f:
    json.dump(data, f, indent=4)

print(f"Transformed {len(data)} feats")