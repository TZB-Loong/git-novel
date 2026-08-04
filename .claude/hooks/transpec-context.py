#!/usr/bin/env python3
"""
Transpec Context Injection Hook

Injects transpec context into Claude Code sessions:
- Reads .transpec/config.yaml for conversion settings
- Reads .transpec/ir/ for Intermediate Representation data
- Provides context to help Claude understand the conversion task
"""

import json
import sys
from pathlib import Path


def get_transpec_context():
    """Read transpec configuration and IR data."""
    context = {
        'transpec': {
            'configured': False,
            'config': None,
            'ir_files': []
        }
    }

    # Check if transpec is initialized
    transpec_dir = Path('.transpec')
    if not transpec_dir.exists():
        return context

    context['transpec']['configured'] = True

    # Read config.yaml
    config_path = transpec_dir / 'config.yaml'
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                content = f.read()
                # Simple parsing for key values
                config = {}
                for line in content.split('\n'):
                    if ':' in line and not line.strip().startswith('#'):
                        key, value = line.split(':', 1)
                        config[key.strip()] = value.strip().strip('"').strip("'")
                context['transpec']['config'] = config
        except Exception:
            pass

    # Read IR files
    ir_dir = transpec_dir / 'ir'
    if ir_dir.exists():
        try:
            ir_files = list(ir_dir.glob('*.json'))
            context['transpec']['ir_files'] = [
                {
                    'name': f.stem,
                    'size': f.stat().st_size
                }
                for f in ir_files[:10]  # Limit to first 10
            ]
        except Exception:
            pass

    return context


def main():
    """Main entry point for the hook."""
    try:
        context = get_transpec_context()

        # Output as hook-specific additional context
        output = {
            'hookSpecificOutput': {
                'additionalContext': format_context(context)
            }
        }

        print(json.dumps(output))
    except Exception as e:
        # Don't fail the hook, just output empty context
        print(json.dumps({'hookSpecificOutput': {'additionalContext': ''}}))
        sys.exit(0)


def format_context(context):
    """Format context for display."""
    if not context['transpec']['configured']:
        return ''

    lines = ['\n[Transpec Context]']

    config = context['transpec'].get('config')
    if config:
        lines.append(f"Source: {config.get('sourceFramework', 'unknown')}")
        lines.append(f"Target: {config.get('targetFramework', 'unknown')}")
        lines.append(f"Mode: {config.get('mode', 'unknown')}")

    ir_count = len(context['transpec'].get('ir_files', []))
    if ir_count > 0:
        lines.append(f"IR files: {ir_count} file(s)")

    return '\n'.join(lines)


if __name__ == '__main__':
    main()
