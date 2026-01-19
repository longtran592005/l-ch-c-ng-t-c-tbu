/**
 * Simple Whisper Speech-to-Text Integration
 * Uses local Python script (vinai.py) instead of FastAPI service
 * Simpler, more reliable, uses VinAI Whisper model
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/errors.util';

// ==================== Configuration ====================

// Path to whisper folder (same level as backend)
const WHISPER_DIR = path.resolve(path.join(__dirname, '../../../whisper'));
const VENV_PYTHON = path.join(WHISPER_DIR, '.venv', 'Scripts', 'python.exe');
const VINAI_SCRIPT = path.join(WHISPER_DIR, 'vinai.py');

// Model config (same as vinai.py uses)
const DEFAULT_MODEL = "suzii/vi-whisper-large-v3-turbo-v1-ct2";
const DEFAULT_BATCH_SIZE = 4;
const DEFAULT_BEAM_SIZE = 5;

// ==================== Types ====================

interface TranscribeOptions {
    inputFile: string;
    outputFile?: string;
    batchSize?: number;
    beamSize?: number;
    device?: 'cuda' | 'cpu';
}

interface TranscribeResult {
    success: boolean;
    outputPath?: string;
    text?: string;
    duration?: number;
    error?: string;
}

// ==================== Helper Functions ====================

// Path to requestments file
const REQUIREMENTS_FILE = path.join(WHISPER_DIR, 'requirements.txt');

/**
 * Check and install dependencies if missing
 */
const ensureDependencies = async (): Promise<boolean> => {
    try {
        console.log('[Whisper] Checking dependencies...');

        // Check if faster_whisper is installed
        const checkProcess = spawn(VENV_PYTHON, ['-c', 'import faster_whisper']);

        const isInstalled = await new Promise<boolean>((resolve) => {
            checkProcess.on('exit', (code) => resolve(code === 0));
            checkProcess.on('error', () => resolve(false));
        });

        if (isInstalled) {
            console.log('[Whisper] Dependencies are installed.');
            return true;
        }

        console.log('[Whisper] Dependencies missing. Installing directly...');
        // Install directly to avoid "requirements.txt" path issues with spaces
        // We need faster-whisper and tqdm
        const installProcess = spawn(VENV_PYTHON, ['-m', 'pip', 'install', 'faster-whisper', 'tqdm', '--no-warn-script-location']);

        let installError = '';

        installProcess.stdout?.on('data', (data) => {
            const str = data.toString();
            console.log('[Whisper Install]', str.trim());
        });

        installProcess.stderr?.on('data', (data) => {
            const str = data.toString().trim();
            console.error('[Whisper Install Error]', str);
            installError += str + '\n';
        });

        return new Promise<boolean>((resolve) => {
            installProcess.on('exit', (code) => {
                if (code === 0) {
                    console.log('[Whisper] Dependencies installed successfully.');
                    resolve(true);
                } else {
                    console.error('[Whisper] Failed to install dependencies. Exit code:', code);
                    console.error('[Whisper] Detailed Error:', installError);
                    resolve(false);
                }
            });
            installProcess.on('error', (err) => {
                console.error('[Whisper] Install process error:', err);
                resolve(false);
            });
        });

    } catch (error) {
        console.error('[Whisper] Error in ensureDependencies:', error);
        return false;
    }
};

/**
 * Check if Python environment exists
 */
export const checkPythonEnv = (): boolean => {
    // We strictly check for the python executable now
    if (!fs.existsSync(VENV_PYTHON)) {
        console.error('[Whisper] Python executable not found at:', VENV_PYTHON);
        console.error('[Whisper] Please run the python setup instructions in RUN_PROJECT_V2.md');
        return false;
    }
    return true;
};
/**
 * Check if file exists
 */
export const checkAudioFile = (filePath: string): boolean => {
    return fs.existsSync(filePath);
};

/**
 * Get output file path (default: same as input but .txt)
 */
const getOutputPath = (inputFile: string, customOutput?: string): string => {
    if (customOutput) {
        return customOutput;
    }
    const ext = path.extname(inputFile);
    const baseName = path.basename(inputFile, ext);
    const outputDir = path.dirname(inputFile);
    return path.join(outputDir, `${baseName}.txt`);
};

/**
 * Run vinai.py script
 */
export const transcribeAudioFile = async (
    options: TranscribeOptions
): Promise<TranscribeResult> => {
    const {
        inputFile,
        outputFile,
        batchSize = DEFAULT_BATCH_SIZE,
        beamSize = DEFAULT_BEAM_SIZE,
        device = 'cuda'
    } = options;

    console.log('[Whisper] Starting transcription...');
    console.log('[Whisper] Input file:', inputFile);
    console.log('[Whisper] Output file:', outputFile || 'auto');

    // Check prerequisites
    if (!checkAudioFile(inputFile)) {
        return {
            success: false,
            error: `Audio file not found: ${inputFile}`
        };
    }

    if (!checkPythonEnv()) {
        return {
            success: false,
            error: 'Python environment checks failed. Check server logs.'
        };
    }

    // Ensure dependencies are installed
    const depsOk = await ensureDependencies();
    if (!depsOk) {
        return {
            success: false,
            error: 'Failed to install required Python dependencies (faster-whisper). Check server logs.'
        };
    }


    const outputPath = getOutputPath(inputFile, outputFile);

    try {
        // Build command
        const args = [
            VINAI_SCRIPT,
            inputFile,
            '-o', outputPath,
            '--batch_size', batchSize.toString(),
            '--beam_size', beamSize.toString(),
            '--device', device
        ];

        // Settings for UTF-8 support on Windows
        const env = {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1'
        };

        console.log('[Whisper] Command:', VENV_PYTHON, args.join(' '));

        return new Promise((resolve) => {
            const pythonProcess = spawn(VENV_PYTHON, args, { env });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
                console.log('[Whisper stdout]:', data.toString().trim());
            });

            pythonProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
                console.error('[Whisper stderr]:', data.toString().trim());
            });

            pythonProcess.on('close', async (code) => {
                console.log('[Whisper] Process exited with code:', code);

                if (code === 0) {
                    // Success - read output file
                    try {
                        if (fs.existsSync(outputPath)) {
                            const text = fs.readFileSync(outputPath, 'utf-8');
                            console.log('[Whisper] Transcription successful!');
                            console.log(`[Whisper] Output file: ${outputPath}`);
                            console.log(`[Whisper] Text length: ${text.length} chars`);

                            resolve({
                                success: true,
                                outputPath,
                                text,
                                duration: undefined // Could extract from stdout if needed
                            });
                        } else {
                            resolve({
                                success: false,
                                error: 'Output file not generated'
                            });
                        }
                    } catch (readError) {
                        console.error('[Whisper] Error reading output file:', readError);
                        resolve({
                            success: false,
                            error: `Failed to read output file: ${readError}`
                        });
                    }
                } else {
                    console.error('[Whisper] Process failed with code:', code);
                    resolve({
                        success: false,
                        error: `Transcription failed (exit code: ${code})${stderr ? `: ${stderr}` : ''}`
                    });
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('[Whisper] Process error:', error);
                resolve({
                    success: false,
                    error: `Failed to start Python process: ${error.message}`
                });
            });

            // Timeout after 10 minutes
            setTimeout(() => {
                if (!pythonProcess.killed) {
                    console.warn('[Whisper] Timeout - killing process');
                    pythonProcess.kill('SIGTERM');
                }
            }, 10 * 60 * 1000);
        });

    } catch (error: any) {
        console.error('[Whisper] Unexpected error:', error);
        return {
            success: false,
            error: `Unexpected error: ${error.message}`
        };
    }
};

/**
 * Simple wrapper for frontend - transcribe and return text directly
 */
export const transcribeToText = async (
    audioFilePath: string,
    options?: Partial<TranscribeOptions>
): Promise<string> => {
    const result = await transcribeAudioFile({
        inputFile: audioFilePath,
        ...options
    });

    if (!result.success) {
        throw new AppError(500, 'TRANSCRIPTION_FAILED', result.error || 'Transcription failed');
    }

    return result.text || '';
};

/**
 * Get transcribed text from file (for quick access without re-running)
 */
export const getTranscribedText = (outputPath: string): string | null => {
    try {
        if (fs.existsSync(outputPath)) {
            return fs.readFileSync(outputPath, 'utf-8');
        }
        return null;
    } catch (error) {
        console.error('[Whisper] Error reading transcribed text:', error);
        return null;
    }
};
