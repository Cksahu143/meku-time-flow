import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPlatformAdmin: boolean;
  schoolId: string | null;
  schools: { id: string; name: string; code: string }[];
  onImportComplete: () => void;
}

interface ParsedUser {
  email: string;
  username?: string;
  display_name?: string;
  password: string;
  role: string;
  rowNumber: number;
  errors: string[];
  status: 'pending' | 'importing' | 'success' | 'error';
  resultMessage?: string;
}

const REQUIRED_COLUMNS = ['email', 'password', 'role'];
const OPTIONAL_COLUMNS = ['username', 'display_name'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const VALID_ROLES = ['student', 'teacher', 'school_admin'];

const normalizeRoleValue = (rawRole: string): string => {
  const role = String(rawRole || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .trim()
    .replace(/[\s\-]+/g, '_');

  const roleAliases: Record<string, string> = {
    schooladmin: 'school_admin',
    school_admin: 'school_admin',
    admin: 'school_admin',
    teacher: 'teacher',
    student: 'student',
  };

  return roleAliases[role] || role;
};

export function BulkImportDialog({ open, onOpenChange, isPlatformAdmin, schoolId, schools, onImportComplete }: BulkImportDialogProps) {
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schoolId || '');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setParsedUsers([]);
    setProgress(0);
    setParseError(null);
    setFileName('');
    setShowFormatHelp(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (val: boolean) => {
    if (!importing) {
      if (!val) resetState();
      onOpenChange(val);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      { email: 'student1@example.com', password: 'Pass1234!', role: 'student', username: 'student1', display_name: 'John Doe' },
      { email: 'teacher1@example.com', password: 'Teach1234!', role: 'teacher', username: 'teacher1', display_name: 'Jane Smith' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData, { header: ALL_COLUMNS });

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'bulk_import_template.xlsx');
  };

  const normalizeHeader = (header: string): string => {
    const h = header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
      .replace(/[\s\-_.]+/g, '_')
      .replace(/^_|_$/g, '');

    const aliases: Record<string, string> = {
      e_mail: 'email',
      email_address: 'email',
      emailaddress: 'email',
      mail: 'email',
      correo: 'email',
      user_name: 'username',
      user: 'username',
      nombre_de_usuario: 'username',
      login: 'username',
      name: 'display_name',
      full_name: 'display_name',
      fullname: 'display_name',
      display: 'display_name',
      displayname: 'display_name',
      nombre: 'display_name',
      pass: 'password',
      pwd: 'password',
      passwd: 'password',
      contrasena: 'password',
      password_text: 'password',
      user_role: 'role',
      account_type: 'role',
      user_type: 'role',
      rol: 'role',
      type: 'role',
    };

    return aliases[h] || h;
  };

  const findColumnIndex = (headers: string[], candidates: string[]): number => {
    const normalizedHeaders = headers.map(h => normalizeHeader(String(h || '')));
    const normalizedCandidates = candidates.map(c => normalizeHeader(c));

    for (const candidate of normalizedCandidates) {
      const exactIndex = normalizedHeaders.indexOf(candidate);
      if (exactIndex !== -1) return exactIndex;
    }

    for (const candidate of normalizedCandidates) {
      const startsWithIndex = normalizedHeaders.findIndex(h => h.startsWith(candidate));
      if (startsWithIndex !== -1) return startsWithIndex;
    }

    for (const candidate of normalizedCandidates) {
      const containsIndex = normalizedHeaders.findIndex(h => h.includes(candidate));
      if (containsIndex !== -1) return containsIndex;
    }

    return -1;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcelLockFile = /^~\$/.test(file.name);
    if (isExcelLockFile) {
      setParseError('You selected an Excel temporary lock file (starts with "~$"). Please upload the real spreadsheet file instead.');
      setParsedUsers([]);
      setFileName(file.name);
      setShowFormatHelp(false);
      return;
    }

    setParseError(null);
    setParsedUsers([]);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', raw: true });

        const headerAliases: Record<string, string[]> = {
          email: ['email', 'email address', 'e-mail', 'mail', 'correo'],
          password: ['password', 'pass', 'pwd', 'passwd', 'contrasena'],
          role: ['role', 'user role', 'account type', 'user type', 'rol'],
          username: ['username', 'user name', 'login'],
          display_name: ['display_name', 'display name', 'name', 'full name', 'nombre'],
        };

        let rows: (string | number | null)[][] = [];
        let headerRowIndex = -1;
        let columnMap: Record<string, number> = {};

        const parseSingleColumnDelimitedRows = (inputRows: (string | number | null)[][]) => {
          return inputRows.map((row) => {
            if (row.length !== 1) return row;
            const firstCell = String(row[0] ?? '');
            const delimiterMatch = firstCell.match(/[;,\t|]/);
            if (!delimiterMatch) return row;
            const delimiter = delimiterMatch[0];
            return firstCell.split(delimiter).map((cell) => cell.trim());
          });
        };

        for (const currentSheetName of workbook.SheetNames) {
          const currentSheet = workbook.Sheets[currentSheetName];
          if (!currentSheet) continue;

          const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(currentSheet, { header: 1, raw: true, defval: '' });
          const candidateRows = parseSingleColumnDelimitedRows(rawRows);
          if (!candidateRows.length) continue;

          const scanLimit = Math.min(candidateRows.length, 15);
          for (let i = 0; i < scanLimit; i++) {
            const candidate = (candidateRows[i] || []).map(cell => String(cell ?? '').trim());
            if (!candidate.some(Boolean)) continue;

            const testMap: Record<string, number> = {};
            for (const key of ALL_COLUMNS) {
              testMap[key] = findColumnIndex(candidate, headerAliases[key] || [key]);
            }

            const hasRequired = REQUIRED_COLUMNS.every(col => testMap[col] !== -1);
            if (hasRequired) {
              rows = candidateRows;
              headerRowIndex = i;
              columnMap = testMap;
              break;
            }
          }

          if (headerRowIndex !== -1) break;
        }

        if (headerRowIndex === -1) {
          const previewBySheet = workbook.SheetNames
            .map((sheetName) => {
              const sheet = workbook.Sheets[sheetName];
              if (!sheet) return `${sheetName}: none`;
              const preview = XLSX.utils
                .sheet_to_json<(string | number | null)[]>(sheet, { header: 1, raw: true, defval: '' })
                .slice(0, 3)
                .flat()
                .map(cell => String(cell ?? '').trim())
                .filter(Boolean)
                .slice(0, 8)
                .join(', ');
              return `${sheetName}: ${preview || 'none'}`;
            })
            .join(' | ');

          setParseError(`Couldn't detect required columns (email, password, role) in any sheet. Detected headers preview: ${previewBySheet}. Download the template for the recommended format.`);
          setShowFormatHelp(false);
          return;
        }

        const allowedRoles = isPlatformAdmin ? VALID_ROLES : ['student', 'teacher'];
        const parsed: ParsedUser[] = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const values: Record<string, string> = {};

          for (const key of ALL_COLUMNS) {
            const idx = columnMap[key];
            values[key] = idx >= 0 ? String(row[idx] ?? '').trim() : '';
          }

          const isEmpty = Object.values(values).every(v => !v);
          if (isEmpty) continue;

          const errors: string[] = [];
          const email = values.email?.toLowerCase();
          const password = values.password;
          const role = normalizeRoleValue(values.role);
          const username = values.username || undefined;
          const display_name = values.display_name || undefined;

          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email');
          if (!password || password.length < 8) errors.push('Password must be ≥8 chars');
          if (!role || !allowedRoles.includes(role)) errors.push(`Role must be: ${allowedRoles.join(', ')}`);

          parsed.push({
            email,
            password,
            role,
            username,
            display_name,
            rowNumber: i + 1,
            errors,
            status: 'pending',
          });
        }

        if (!parsed.length) {
          setParseError('No user rows found under the header row. Download the template and fill at least one row.');
          setShowFormatHelp(false);
          return;
        }

        const emailCounts = new Map<string, number[]>();
        parsed.forEach((u, i) => {
          if (u.email) {
            const indexes = emailCounts.get(u.email) || [];
            indexes.push(i);
            emailCounts.set(u.email, indexes);
          }
        });

        emailCounts.forEach(indices => {
          if (indices.length > 1) {
            indices.forEach(i => parsed[i].errors.push('Duplicate email in file'));
          }
        });

        setParsedUsers(parsed);

        const errorCount = parsed.filter(u => u.errors.length > 0).length;
        if (errorCount > 0 && errorCount === parsed.length) {
          const exampleIssues = parsed
            .slice(0, 3)
            .map((u) => `Row ${u.rowNumber}: ${u.errors.join(', ')}`)
            .join(' | ');
          setParseError(`All rows have validation errors. ${exampleIssues}. Recommended columns: ${ALL_COLUMNS.join(', ')}.`);
          setShowFormatHelp(false);
          return;
        }

        setShowFormatHelp(false);
      } catch (err: any) {
        setParseError(`Could not parse file: ${err.message}. Make sure it's a valid Excel or CSV file.`);
        setShowFormatHelp(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [isPlatformAdmin]);

  const startImport = async () => {
    const targetSchool = isPlatformAdmin ? selectedSchoolId : schoolId;
    if (!targetSchool) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a school' });
      return;
    }

    const validUsers = parsedUsers.filter(u => u.errors.length === 0);
    if (validUsers.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No valid users to import' });
      return;
    }

    setImporting(true);
    setProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsedUsers.length; i++) {
      const user = parsedUsers[i];
      if (user.errors.length > 0) {
        setParsedUsers(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', resultMessage: user.errors.join('; ') } : u));
        errorCount++;
        setProgress(((i + 1) / parsedUsers.length) * 100);
        continue;
      }

      setParsedUsers(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'importing' } : u));

      try {
        const { data, error } = await supabase.functions.invoke('create-school-user', {
          body: {
            email: user.email,
            password: user.password,
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            school_id: targetSchool,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setParsedUsers(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'success', resultMessage: 'Created successfully' } : u));
        successCount++;
      } catch (err: any) {
        setParsedUsers(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', resultMessage: err.message || 'Failed to create' } : u));
        errorCount++;
      }

      setProgress(((i + 1) / parsedUsers.length) * 100);
    }

    setImporting(false);
    toast({
      title: 'Import Complete',
      description: `${successCount} created, ${errorCount} failed out of ${parsedUsers.length} total`,
    });
    onImportComplete();
  };

  const validCount = parsedUsers.filter(u => u.errors.length === 0).length;
  const errorRowCount = parsedUsers.filter(u => u.errors.length > 0).length;
  const completedCount = parsedUsers.filter(u => u.status === 'success' || u.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Users
          </DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx, .xls) or CSV file to create multiple user accounts at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Step 1: Template & Upload */}
          {parsedUsers.length === 0 && (
            <>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowFormatHelp(!showFormatHelp)} className="gap-2">
                  <Info className="h-4 w-4" />
                  Format Guide
                </Button>
              </div>

              {showFormatHelp && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Required Format</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="text-sm">Your file must have these <strong>required columns</strong>:</p>
                    <div className="flex flex-wrap gap-1">
                      {REQUIRED_COLUMNS.map(c => <Badge key={c} variant="destructive">{c}</Badge>)}
                      {OPTIONAL_COLUMNS.map(c => <Badge key={c} variant="secondary">{c} (optional)</Badge>)}
                    </div>
                    <p className="text-sm mt-2"><strong>Rules:</strong></p>
                    <ul className="text-sm list-disc pl-4 space-y-1">
                      <li><strong>email</strong> — valid email address</li>
                      <li><strong>password</strong> — minimum 8 characters</li>
                      <li><strong>role</strong> — {isPlatformAdmin ? 'student, teacher, or school_admin' : 'student or teacher'}</li>
                      <li><strong>username</strong> — optional, any text</li>
                      <li><strong>display_name</strong> — optional, full name</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Column headers are flexible — "Email", "e-mail", "email_address" all work. We'll try to match them.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>File Error</AlertTitle>
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.ods,.tsv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </>
          )}

          {/* Step 2: Preview */}
          {parsedUsers.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Badge variant="outline">{fileName}</Badge>
                  <Badge variant="secondary">{parsedUsers.length} rows</Badge>
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">{validCount} valid</Badge>
                  {errorRowCount > 0 && (
                    <Badge variant="destructive">{errorRowCount} errors</Badge>
                  )}
                </div>
                {!importing && completedCount === 0 && (
                  <Button variant="ghost" size="sm" onClick={resetState}>
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {/* School selector for platform admins */}
              {isPlatformAdmin && completedCount === 0 && (
                <div className="space-y-2">
                  <Label>Target School *</Label>
                  <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select school for all users" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing...</span>
                    <span>{completedCount} / {parsedUsers.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.map((user, idx) => (
                      <TableRow key={idx} className={user.errors.length > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{user.rowNumber}</TableCell>
                        <TableCell className="text-sm font-mono">{user.email || '—'}</TableCell>
                        <TableCell className="text-sm">{user.username || '—'}</TableCell>
                        <TableCell className="text-sm">{user.display_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={user.errors.length > 0 ? 'destructive' : 'secondary'} className="text-xs">
                            {user.role || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.status === 'pending' && user.errors.length > 0 && (
                            <span className="text-xs text-destructive">{user.errors.join('; ')}</span>
                          )}
                          {user.status === 'pending' && user.errors.length === 0 && (
                            <span className="text-xs text-muted-foreground">Ready</span>
                          )}
                          {user.status === 'importing' && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          {user.status === 'success' && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Created</span>
                            </div>
                          )}
                          {user.status === 'error' && user.resultMessage && (
                            <span className="text-xs text-destructive">{user.resultMessage}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            {completedCount === parsedUsers.length && parsedUsers.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          {parsedUsers.length > 0 && completedCount === 0 && (
            <Button
              onClick={startImport}
              disabled={importing || validCount === 0 || (isPlatformAdmin && !selectedSchoolId)}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                `Import ${validCount} User${validCount !== 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
